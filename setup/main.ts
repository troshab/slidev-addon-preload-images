/**
 * slidev-addon-preload-images
 *
 * Automatically preloads images from upcoming slides for smoother transitions.
 *
 * Features:
 * - Preloads images N slides ahead (configurable, default: 3)
 * - Extracts images from markdown, HTML, and CSS
 * - Includes frontmatter image/background properties
 * - Zero configuration required
 *
 * Configuration (optional, in slides.md frontmatter):
 * ---
 * preloadImages:
 *   ahead: 5                    # How many slides ahead to preload
 *   urls:                       # Additional URLs to preload immediately
 *     - /hero-image.png
 *     - /final-diagram.svg
 * ---
 */

import { defineAppSetup } from '@slidev/types'
import { watch } from 'vue'

// Cache of preloaded image URLs
const preloadedImages = new Set<string>()

/**
 * Extract image URLs from slide content (markdown, HTML, CSS)
 */
function extractImageUrls(content: string): string[] {
  const urls: string[] = []

  // Markdown images: ![alt](url) or ![alt](url "title")
  const mdPattern = /!\[[^\]]*\]\(([^)\s"]+)/g
  let match
  while ((match = mdPattern.exec(content)) !== null) {
    urls.push(match[1])
  }

  // HTML img tags: <img src="url">
  const imgPattern = /<img[^>]+src=["']([^"']+)/gi
  while ((match = imgPattern.exec(content)) !== null) {
    urls.push(match[1])
  }

  // CSS url() patterns (for background-image, etc.)
  const urlPattern = /url\(["']?([^"')]+)/g
  while ((match = urlPattern.exec(content)) !== null) {
    // Only include image files
    if (/\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i.test(match[1])) {
      urls.push(match[1])
    }
  }

  // HTML style attributes with background
  const stylePattern = /style=["'][^"']*background[^:]*:\s*url\(["']?([^"')]+)/gi
  while ((match = stylePattern.exec(content)) !== null) {
    urls.push(match[1])
  }

  return urls
}

/**
 * Preload a single image by creating an Image object
 */
function preloadImage(url: string): void {
  if (preloadedImages.has(url)) return
  if (!url || url.startsWith('data:')) return

  try {
    const img = new Image()
    img.src = url
    preloadedImages.add(url)
  } catch (e) {
    // Silently ignore invalid URLs
  }
}

/**
 * Extract and preload all images from a slide
 */
function preloadSlideImages(slide: any): void {
  if (!slide) return

  // From slide content
  if (slide.content) {
    extractImageUrls(slide.content).forEach(preloadImage)
  }

  // From slide source (raw markdown)
  if (slide.source?.raw) {
    extractImageUrls(slide.source.raw).forEach(preloadImage)
  }

  // From frontmatter properties
  const fm = slide.frontmatter || slide.meta
  if (fm) {
    if (fm.image) preloadImage(fm.image)
    if (fm.background) preloadImage(fm.background)
    if (fm.backgroundImage) preloadImage(fm.backgroundImage)

    // Layout-specific props
    if (fm.src && /\.(png|jpe?g|gif|webp|svg)$/i.test(fm.src)) {
      preloadImage(fm.src)
    }
  }
}

export default defineAppSetup(({ router }) => {
  // Wait for router and Slidev to be ready
  router.isReady().then(() => {
    // Access Slidev's internal state
    const slidev = (window as any).__slidev__
    if (!slidev?.nav) {
      console.warn('[preload-images] Slidev navigation context not found')
      return
    }

    // Get configuration from frontmatter
    const config = slidev.configs?.preloadImages ?? {}
    const aheadCount = config.ahead ?? 3

    // Get all slides
    const slides = slidev.nav.slides || []

    // Initial preload: first few slides
    const initialCount = Math.min(aheadCount + 1, slides.length)
    for (let i = 0; i < initialCount; i++) {
      preloadSlideImages(slides[i])
    }

    // Preload additional URLs from config
    const additionalUrls: string[] = config.urls || []
    additionalUrls.forEach(preloadImage)

    // Watch for slide navigation
    watch(
      () => slidev.nav.currentSlideNo,
      (currentNo: number) => {
        // Preload upcoming slides
        for (let i = 1; i <= aheadCount; i++) {
          const slideIndex = currentNo + i - 1 // slides are 1-indexed
          if (slideIndex >= 0 && slideIndex < slides.length) {
            preloadSlideImages(slides[slideIndex])
          }
        }
      },
      { immediate: true }
    )

    // Log status in dev mode
    if (import.meta.env?.DEV) {
      console.log(`[preload-images] Initialized (${aheadCount} slides ahead)`)
    }
  })
})
