<script setup lang="ts">
/**
 * PreloadImages component - manually preload specific images
 *
 * Use this component to preload heavy images before they're needed.
 * Place it on early slides to ensure smooth transitions later.
 *
 * Usage:
 * <PreloadImages :urls="['/slide10-diagram.png', '/slide15-photo.jpg']" />
 *
 * The component renders nothing visible.
 */

import { onMounted, watch } from 'vue'

const props = defineProps<{
  urls: string[]
}>()

const preloadedUrls = new Set<string>()

function preloadImage(url: string): Promise<void> {
  if (preloadedUrls.has(url)) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      preloadedUrls.add(url)
      resolve()
    }
    img.onerror = () => {
      console.warn(`[PreloadImages] Failed to preload: ${url}`)
      resolve()
    }
    img.src = url
  })
}

async function preloadAll() {
  if (!props.urls?.length) return
  await Promise.all(props.urls.map(preloadImage))
}

onMounted(preloadAll)
watch(() => props.urls, preloadAll, { deep: true })
</script>

<template>
  <!-- Invisible component - only preloads images -->
  <span class="slidev-addon-preload-images" aria-hidden="true" />
</template>

<style>
.slidev-addon-preload-images {
  display: none;
}
</style>
