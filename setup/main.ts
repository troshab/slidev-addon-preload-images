/**
 * slidev-addon-preload-images
 *
 * Smart automatic image preloading for Slidev presentations.
 *
 * Strategy:
 * 1. On startup: immediately preload current + ahead slides (fast, parallel)
 * 2. Then: sequentially preload remaining slides one by one
 * 3. On navigation: ensure upcoming slides are ready
 *
 * Configuration (optional):
 * ---
 * preloadImages:
 *   enabled: true       # Enable/disable (default: true)
 *   ahead: 3            # Slides to preload immediately (default: 3)
 * ---
 */

import { defineAppSetup } from '@slidev/types'
import { watch } from 'vue'

// ============================================
// State
// ============================================

const loaded = new Set<string>()
const loading = new Set<string>()

// ============================================
// Image Extraction
// ============================================

function extractImages(content: string): string[] {
  if (!content) return []

  const urls: string[] = []
  const imgExt = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i
  let m

  // Markdown: ![](url)
  const md = /!\[[^\]]*\]\(([^)\s"']+)/g
  while ((m = md.exec(content))) urls.push(m[1])

  // HTML: <img src="url">
  const html = /<img[^>]+:?src=["']([^"']+)/gi
  while ((m = html.exec(content))) urls.push(m[1])

  // CSS: url(...)
  const css = /url\(["']?([^"')]+)/g
  while ((m = css.exec(content))) {
    if (imgExt.test(m[1])) urls.push(m[1])
  }

  return urls.filter(u => u && !u.startsWith('data:'))
}

function getSlideImages(slide: any): string[] {
  const urls: string[] = []

  // Content
  if (slide?.content) urls.push(...extractImages(slide.content))
  if (slide?.source?.raw) urls.push(...extractImages(slide.source.raw))

  // Frontmatter
  const fm = slide?.frontmatter || slide?.meta || {}
  for (const key of ['image', 'background', 'backgroundImage', 'src', 'cover']) {
    if (typeof fm[key] === 'string') urls.push(fm[key])
  }

  return [...new Set(urls)]
}

// ============================================
// Preloading
// ============================================

function preload(url: string): Promise<void> {
  if (loaded.has(url) || loading.has(url)) return Promise.resolve()

  loading.add(url)

  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => { loading.delete(url); loaded.add(url); resolve() }
    img.onerror = () => { loading.delete(url); resolve() }
    img.src = url
  })
}

async function preloadSlide(images: string[]): Promise<void> {
  // Preload all images from one slide in parallel
  await Promise.all(images.filter(u => !loaded.has(u)).map(preload))
}

async function preloadSequentially(slideImages: string[][], startIndex: number): Promise<void> {
  // Preload slides one by one, in order
  for (let i = startIndex; i < slideImages.length; i++) {
    const images = slideImages[i]
    if (images.length > 0) {
      await preloadSlide(images)
    }

    // Small delay between slides to not block the main thread
    await new Promise(r => setTimeout(r, 50))
  }
}

// ============================================
// Main
// ============================================

export default defineAppSetup(({ router }) => {
  router.isReady().then(async () => {
    const slidev = (window as any).__slidev__
    if (!slidev?.nav) return

    const config = slidev.configs?.preloadImages ?? {}
    if (config.enabled === false) return

    const ahead = config.ahead ?? 3
    const slides: any[] = slidev.nav.slides || []
    const current = (slidev.nav.currentSlideNo ?? 1) - 1

    // Collect images per slide
    const slideImages: string[][] = slides.map(getSlideImages)

    const totalImages = slideImages.flat().length
    if (import.meta.env?.DEV) {
      console.log(`[preload-images] Found ${totalImages} images in ${slides.length} slides`)
    }

    // Phase 1: Immediately preload current + ahead slides (parallel)
    const priorityEnd = Math.min(current + ahead + 1, slides.length)
    const prioritySlides = slideImages.slice(current, priorityEnd)

    await Promise.all(prioritySlides.map(preloadSlide))

    if (import.meta.env?.DEV) {
      console.log(`[preload-images] Priority slides loaded (${current + 1} to ${priorityEnd})`)
    }

    // Phase 2: Sequentially preload remaining slides
    // First: slides after priority range
    preloadSequentially(slideImages, priorityEnd)
      .then(() => {
        // Then: slides before current (if user navigates back)
        if (current > 0) {
          return preloadSequentially(slideImages.slice(0, current).reverse(), 0)
        }
      })

    // Phase 3: On navigation, ensure upcoming slides are ready
    watch(
      () => slidev.nav.currentSlideNo,
      async (newSlide: number) => {
        const idx = newSlide - 1
        // Preload next few slides
        for (let i = 0; i <= ahead; i++) {
          const slideIdx = idx + i
          if (slideIdx < slideImages.length) {
            const images = slideImages[slideIdx].filter(u => !loaded.has(u))
            if (images.length > 0) {
              await preloadSlide(images)
            }
          }
        }
      }
    )
  })
})
