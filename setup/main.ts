/**
 * slidev-addon-preload-images
 *
 * Smart automatic image preloading for Slidev presentations.
 *
 * Features:
 * - Scans ALL slides on startup and collects image URLs
 * - Priority-based loading: current → upcoming → rest
 * - Background loading during browser idle time
 * - Configurable via frontmatter
 *
 * Configuration (optional, in slides.md frontmatter):
 * ---
 * preloadImages:
 *   enabled: true              # Enable/disable (default: true)
 *   priority: 3                # High-priority slides ahead (default: 3)
 *   concurrent: 4              # Concurrent downloads (default: 4)
 *   urls:                      # Additional URLs to preload
 *     - /custom-image.png
 * ---
 */

import { defineAppSetup } from '@slidev/types'
import { watch } from 'vue'

// ============================================
// Image Cache & State
// ============================================

interface PreloadState {
  queued: Set<string>
  loading: Set<string>
  loaded: Set<string>
  failed: Set<string>
}

const state: PreloadState = {
  queued: new Set(),
  loading: new Set(),
  loaded: new Set(),
  failed: new Set(),
}

// ============================================
// Image URL Extraction
// ============================================

/**
 * Extract all image URLs from slide content
 */
function extractImageUrls(content: string): string[] {
  if (!content) return []

  const urls: string[] = []
  const imageExtensions = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|tiff?)$/i

  // Markdown images: ![alt](url) or ![alt](url "title")
  const mdPattern = /!\[[^\]]*\]\(([^)\s"']+)/g
  let match
  while ((match = mdPattern.exec(content)) !== null) {
    urls.push(match[1])
  }

  // HTML img tags: <img src="url"> or <img :src="'url'">
  const imgSrcPattern = /<img[^>]+:?src=["']([^"']+)/gi
  while ((match = imgSrcPattern.exec(content)) !== null) {
    urls.push(match[1])
  }

  // Background images in style: background-image: url(...)
  const bgPattern = /background(?:-image)?:\s*url\(["']?([^"')]+)/gi
  while ((match = bgPattern.exec(content)) !== null) {
    urls.push(match[1])
  }

  // CSS url() in any context
  const urlPattern = /url\(["']?([^"')]+)["']?\)/g
  while ((match = urlPattern.exec(content)) !== null) {
    if (imageExtensions.test(match[1])) {
      urls.push(match[1])
    }
  }

  // Vue :style bindings with backgroundImage
  const vueStylePattern = /backgroundImage:\s*["'`]url\(([^)]+)\)/g
  while ((match = vueStylePattern.exec(content)) !== null) {
    urls.push(match[1].replace(/["'`]/g, ''))
  }

  return urls.filter(url => url && !url.startsWith('data:'))
}

/**
 * Extract images from a slide object
 */
function extractSlideImages(slide: any): string[] {
  const urls: string[] = []

  // From content
  if (slide?.content) {
    urls.push(...extractImageUrls(slide.content))
  }

  // From raw source
  if (slide?.source?.raw) {
    urls.push(...extractImageUrls(slide.source.raw))
  }

  // From frontmatter
  const fm = slide?.frontmatter || slide?.meta || {}

  // Common image properties
  const imageProps = ['image', 'background', 'backgroundImage', 'src', 'cover']
  for (const prop of imageProps) {
    if (fm[prop] && typeof fm[prop] === 'string') {
      urls.push(fm[prop])
    }
  }

  // Layout-specific: intro layout with image
  if (fm.layout === 'intro' && fm.image) {
    urls.push(fm.image)
  }

  // Layout-specific: image, image-left, image-right layouts
  if (['image', 'image-left', 'image-right'].includes(fm.layout) && fm.image) {
    urls.push(fm.image)
  }

  return [...new Set(urls)] // Dedupe
}

// ============================================
// Preloading Logic
// ============================================

/**
 * Preload a single image with Promise
 */
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (state.loaded.has(url) || state.loading.has(url)) {
      resolve()
      return
    }

    state.loading.add(url)
    state.queued.delete(url)

    const img = new Image()

    img.onload = () => {
      state.loading.delete(url)
      state.loaded.add(url)
      resolve()
    }

    img.onerror = () => {
      state.loading.delete(url)
      state.failed.add(url)
      resolve()
    }

    img.src = url
  })
}

/**
 * Preload multiple images with concurrency limit
 */
async function preloadBatch(urls: string[], concurrent: number = 4): Promise<void> {
  const queue = urls.filter(url =>
    !state.loaded.has(url) &&
    !state.loading.has(url) &&
    !state.failed.has(url)
  )

  // Process in batches
  for (let i = 0; i < queue.length; i += concurrent) {
    const batch = queue.slice(i, i + concurrent)
    await Promise.all(batch.map(preloadImage))
  }
}

/**
 * Preload images during browser idle time
 */
function preloadInIdle(urls: string[], concurrent: number = 2): void {
  const queue = [...urls]

  const processNext = (deadline?: IdleDeadline) => {
    // Process while we have time and items
    while (queue.length > 0 && (!deadline || deadline.timeRemaining() > 10)) {
      const batch = queue.splice(0, concurrent)
      batch.forEach(url => {
        if (!state.loaded.has(url) && !state.loading.has(url)) {
          preloadImage(url)
        }
      })
    }

    // Schedule more if queue not empty
    if (queue.length > 0) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(processNext, { timeout: 2000 })
      } else {
        setTimeout(() => processNext(), 100)
      }
    }
  }

  // Start processing
  if ('requestIdleCallback' in window) {
    requestIdleCallback(processNext, { timeout: 1000 })
  } else {
    setTimeout(() => processNext(), 50)
  }
}

// ============================================
// Main Setup
// ============================================

export default defineAppSetup(({ router }) => {
  router.isReady().then(() => {
    const slidev = (window as any).__slidev__

    if (!slidev?.nav) {
      console.warn('[preload-images] Slidev context not found')
      return
    }

    // Get configuration
    const config = slidev.configs?.preloadImages ?? {}

    if (config.enabled === false) {
      return // Disabled
    }

    const priorityAhead = config.priority ?? 3
    const concurrent = config.concurrent ?? 4
    const additionalUrls: string[] = config.urls ?? []

    // Get all slides
    const slides: any[] = slidev.nav.slides || []

    // ========================================
    // Phase 1: Collect ALL images from ALL slides
    // ========================================

    const allImages: Map<number, string[]> = new Map()
    const allUrls: string[] = []

    slides.forEach((slide, index) => {
      const slideImages = extractSlideImages(slide)
      allImages.set(index, slideImages)
      allUrls.push(...slideImages)
    })

    // Add additional URLs from config
    allUrls.push(...additionalUrls)

    // Dedupe
    const uniqueUrls = [...new Set(allUrls)]

    if (import.meta.env?.DEV) {
      console.log(`[preload-images] Found ${uniqueUrls.length} images in ${slides.length} slides`)
    }

    // ========================================
    // Phase 2: Priority preloading
    // ========================================

    const currentSlide = slidev.nav.currentSlideNo ?? 1

    // High priority: current + next N slides
    const highPriorityUrls: string[] = []
    for (let i = 0; i <= priorityAhead; i++) {
      const slideIndex = currentSlide - 1 + i
      if (allImages.has(slideIndex)) {
        highPriorityUrls.push(...allImages.get(slideIndex)!)
      }
    }

    // Preload high priority immediately
    preloadBatch([...new Set(highPriorityUrls)], concurrent)

    // ========================================
    // Phase 3: Background preloading (rest)
    // ========================================

    const lowPriorityUrls = uniqueUrls.filter(url => !highPriorityUrls.includes(url))
    preloadInIdle(lowPriorityUrls, 2)

    // ========================================
    // Phase 4: Watch navigation
    // ========================================

    watch(
      () => slidev.nav.currentSlideNo,
      (newSlide: number) => {
        // Preload upcoming slides on navigation
        const upcoming: string[] = []
        for (let i = 1; i <= priorityAhead; i++) {
          const slideIndex = newSlide - 1 + i
          if (allImages.has(slideIndex)) {
            upcoming.push(...allImages.get(slideIndex)!)
          }
        }

        // Filter already loaded
        const toLoad = upcoming.filter(url => !state.loaded.has(url))
        if (toLoad.length > 0) {
          preloadBatch(toLoad, concurrent)
        }
      }
    )

    // ========================================
    // Debug info (dev mode only)
    // ========================================

    if (import.meta.env?.DEV) {
      // Expose state for debugging
      ;(window as any).__preloadImages__ = {
        state,
        allImages,
        getStats: () => ({
          total: uniqueUrls.length,
          loaded: state.loaded.size,
          loading: state.loading.size,
          failed: state.failed.size,
          queued: state.queued.size,
        }),
      }

      console.log('[preload-images] Initialized. Debug: window.__preloadImages__.getStats()')
    }
  })
})
