/**
 * Automatic image preloading for Slidev.
 *
 * Scans all slides for images (markdown, HTML, CSS url(), frontmatter)
 * and preloads them in the background to avoid flickering on transitions.
 */

import { defineAppSetup } from '@slidev/types'
import { watch } from 'vue'

const loaded = new Set<string>()
const loading = new Set<string>()

/** Extract image URLs from slide markdown/HTML content */
function extractImages(content: string): string[] {
  if (!content) return []

  const urls: string[] = []
  const imgExt = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i
  let m

  // ![alt](url)
  const md = /!\[[^\]]*\]\(([^)\s"']+)/g
  while ((m = md.exec(content))) urls.push(m[1])

  // <img src="url"> or <img :src="url">
  const html = /<img[^>]+:?src=["']([^"']+)/gi
  while ((m = html.exec(content))) urls.push(m[1])

  // url(...) - only known image extensions
  const css = /url\(["']?([^"')]+)/g
  while ((m = css.exec(content))) {
    if (imgExt.test(m[1])) urls.push(m[1])
  }

  return urls.filter(u => u && !u.startsWith('data:'))
}

/** Collect all image URLs from a single slide (content + frontmatter) */
function getSlideImages(slide: any): string[] {
  const urls: string[] = []

  if (slide?.content) urls.push(...extractImages(slide.content))
  if (slide?.source?.raw) urls.push(...extractImages(slide.source.raw))

  const fm = slide?.frontmatter || slide?.meta || {}
  for (const key of ['image', 'background', 'backgroundImage', 'src', 'cover']) {
    if (typeof fm[key] === 'string') urls.push(fm[key])
  }

  return [...new Set(urls)]
}

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

/** Preload all images from one slide in parallel */
async function preloadSlide(images: string[]): Promise<void> {
  await Promise.all(images.filter(u => !loaded.has(u)).map(preload))
}

/** Preload slides one by one with small delays to not block the main thread */
async function preloadSequentially(slideImages: string[][]): Promise<void> {
  for (const images of slideImages) {
    if (images.length > 0) await preloadSlide(images)
    await new Promise(r => setTimeout(r, 50))
  }
}

export default defineAppSetup(({ router }) => {
  router.isReady().then(async () => {
    const slidev = (window as any).__slidev__
    if (!slidev?.nav) return

    const config = slidev.configs?.preloadImages ?? {}
    if (config.enabled === false) return

    const ahead = config.ahead ?? 0
    const slides: any[] = slidev.nav.slides || []
    const current = (slidev.nav.currentSlideNo ?? 1) - 1
    const slideImages: string[][] = slides.map(getSlideImages)

    if (import.meta.env?.DEV) {
      console.log(`[preload-images] Found ${slideImages.flat().length} images in ${slides.length} slides`)
    }

    if (ahead === 0) {
      // Preload everything immediately
      await Promise.all(slideImages.map(preloadSlide))

      if (import.meta.env?.DEV) {
        console.log(`[preload-images] All slides preloaded`)
      }
    } else {
      // Preload bidirectional window [current - ahead, current + ahead]
      const priorityStart = Math.max(current - ahead, 0)
      const priorityEnd = Math.min(current + ahead + 1, slides.length)
      await Promise.all(slideImages.slice(priorityStart, priorityEnd).map(preloadSlide))

      if (import.meta.env?.DEV) {
        console.log(`[preload-images] Priority slides loaded (${priorityStart + 1} to ${priorityEnd})`)
      }

      // Then the rest sequentially: forward from window end, then backward from window start
      preloadSequentially(slideImages.slice(priorityEnd)).then(() => {
        if (priorityStart > 0) return preloadSequentially(slideImages.slice(0, priorityStart).reverse())
      })

      // On navigation, preload bidirectional window around new position
      watch(
        () => slidev.nav.currentSlideNo,
        async (no: number) => {
          const idx = no - 1
          const from = Math.max(idx - ahead, 0)
          const to = Math.min(idx + ahead + 1, slideImages.length)
          for (let i = from; i < to; i++) {
            const imgs = slideImages[i]
            if (imgs?.length) await preloadSlide(imgs)
          }
        }
      )
    }
  })
})
