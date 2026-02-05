# slidev-addon-preload-images

[![NPM version](https://img.shields.io/npm/v/slidev-addon-preload-images?color=blue)](https://www.npmjs.com/package/slidev-addon-preload-images)

Slidev addon for automatic image preloading — smoother slide transitions with zero configuration.

## Features

- **Automatic preloading** — images from upcoming slides are loaded in background
- **Configurable lookahead** — preload N slides ahead (default: 3)
- **Smart extraction** — finds images in markdown, HTML, CSS, and frontmatter
- **Manual control** — `PreloadImages` component for explicit preloading
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

That's it! Images will be automatically preloaded.

## Configuration (Optional)

Customize behavior in your frontmatter:

```yaml
---
addons:
  - slidev-addon-preload-images

preloadImages:
  ahead: 5                    # Preload 5 slides ahead (default: 3)
  urls:                       # Additional URLs to preload immediately
    - /hero-image.png
    - /final-diagram.svg
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

<!-- Preload heavy images used in later slides -->
<PreloadImages :urls="[
  '/slides/architecture-diagram.png',
  '/slides/team-photo.jpg',
  '/slides/demo-screenshot.png'
]" />
```

## How It Works

1. **On page load**: Preloads images from the first N+1 slides
2. **On navigation**: Preloads images from the next N slides
3. **Image sources detected**:
   - Markdown: `![alt](url)`
   - HTML: `<img src="url">`
   - CSS: `url(...)` in styles
   - Frontmatter: `image`, `background`, `backgroundImage` properties

## Props

### PreloadImages Component

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `urls` | `string[]` | Yes | Array of image URLs to preload |

### Frontmatter Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ahead` | `number` | `3` | Number of slides to preload ahead |
| `urls` | `string[]` | `[]` | Additional URLs to preload on startup |

## License

MIT
