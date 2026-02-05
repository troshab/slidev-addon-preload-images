# slidev-addon-preload-images

[![NPM version](https://img.shields.io/npm/v/slidev-addon-preload-images?color=blue)](https://www.npmjs.com/package/slidev-addon-preload-images)

Smart automatic image preloading for Slidev presentations — smoother transitions with zero configuration.

## Features

- **Scans ALL slides** — finds every image in your presentation on startup
- **Priority-based loading** — current slide → upcoming → rest in background
- **Idle-time loading** — uses `requestIdleCallback` for non-blocking preload
- **Smart extraction** — finds images in markdown, HTML, CSS, Vue bindings, frontmatter
- **Configurable** — adjust concurrency, priority slides, add custom URLs
- **Zero config** — works out of the box

## Installation

```bash
npm install slidev-addon-preload-images
```

## Usage

Add to your `slides.md` frontmatter:

```yaml
---
addons:
  - slidev-addon-preload-images
---
```

That's it! The addon will:

1. **On startup**: Scan all slides and collect image URLs
2. **Immediately**: Preload current + next 3 slides (high priority)
3. **In background**: Preload remaining images during browser idle time
4. **On navigation**: Ensure upcoming slides are preloaded

## Configuration (Optional)

Customize behavior in frontmatter:

```yaml
---
addons:
  - slidev-addon-preload-images

preloadImages:
  enabled: true           # Enable/disable addon (default: true)
  priority: 5             # High-priority slides ahead (default: 3)
  concurrent: 6           # Concurrent downloads (default: 4)
  urls:                   # Additional URLs to preload
    - /custom-hero.png
    - https://example.com/logo.png
---
```

## Manual Preloading

Use the `PreloadImages` component for explicit control:

```md
---
layout: cover
---

# My Presentation

<!-- Preload specific heavy images -->
<PreloadImages :urls="[
  '/slides/architecture-diagram.png',
  '/slides/team-photo.jpg'
]" />
```

## How It Works

### Image Detection

The addon extracts images from:

| Source | Pattern |
|--------|---------|
| Markdown | `![alt](url)` |
| HTML | `<img src="url">`, `<img :src="url">` |
| CSS | `background-image: url(...)` |
| Vue bindings | `:style="{ backgroundImage: 'url(...)' }"` |
| Frontmatter | `image`, `background`, `backgroundImage`, `src`, `cover` |
| Layouts | `image`, `image-left`, `image-right`, `intro` with image prop |

### Loading Strategy

```
┌─────────────────────────────────────────────────────────┐
│  Startup                                                 │
├─────────────────────────────────────────────────────────┤
│  1. Scan ALL slides → collect image URLs                 │
│  2. Preload current + next N slides (high priority)     │
│  3. Queue remaining → load during idle time              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  On Navigation                                           │
├─────────────────────────────────────────────────────────┤
│  Ensure next N slides are preloaded (if not already)    │
└─────────────────────────────────────────────────────────┘
```

## Debugging

In development mode, check preload status in browser console:

```js
// Get statistics
window.__preloadImages__.getStats()
// → { total: 25, loaded: 20, loading: 2, failed: 0, queued: 3 }

// View all detected images by slide
window.__preloadImages__.allImages
// → Map { 0 => [...], 1 => [...], ... }
```

## Props

### PreloadImages Component

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `urls` | `string[]` | Yes | Array of image URLs to preload |

### Frontmatter Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable the addon |
| `priority` | `number` | `3` | Number of slides to preload with high priority |
| `concurrent` | `number` | `4` | Max concurrent image downloads |
| `urls` | `string[]` | `[]` | Additional URLs to preload on startup |

## Browser Support

- Uses `requestIdleCallback` for background loading (falls back to `setTimeout`)
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## License

MIT
