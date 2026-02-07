# slidev-addon-preload-images

[![NPM version](https://img.shields.io/npm/v/slidev-addon-preload-images?color=blue)](https://www.npmjs.com/package/slidev-addon-preload-images)

Smart automatic image preloading for Slidev — smoother slide transitions, zero config.

## How It Works

```
┌────────────────────────────────────────────────────────┐
│  1. Startup: immediately preload current + 3 slides   │
│     (parallel, fast)                                   │
├────────────────────────────────────────────────────────┤
│  2. Background: sequentially preload remaining slides │
│     (one slide at a time, non-blocking)               │
├────────────────────────────────────────────────────────┤
│  3. Navigation: ensure upcoming slides are ready      │
└────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install slidev-addon-preload-images
```

## Usage

Add to your `slides.md`:

```yaml
---
addons:
  - slidev-addon-preload-images
---
```

Done! All images will be automatically preloaded.

## Configuration (Optional)

```yaml
---
addons:
  - slidev-addon-preload-images

preloadImages:
  enabled: true    # default: true
  ahead: 5         # slides to preload immediately (default: 3)
---
```

## What Gets Preloaded

The addon automatically finds images in:

| Source | Example |
|--------|---------|
| Markdown | `![alt](image.png)` |
| HTML | `<img src="photo.jpg">` |
| Vue bindings | `<img :src="url">` |
| CSS | `background: url(bg.png)` |
| Frontmatter | `image: /hero.png` |
| Layouts | `image-left`, `image-right`, `intro` |

## Debug (Dev Mode)

Open browser console to see preload status:

```
[preload-images] Found 25 images in 40 slides
[preload-images] Priority slides loaded (1 to 4)
```

## License

MIT
