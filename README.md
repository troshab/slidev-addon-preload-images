# slidev-addon-preload-images

[![NPM version](https://img.shields.io/npm/v/slidev-addon-preload-images?color=blue)](https://www.npmjs.com/package/slidev-addon-preload-images)

Preloads images in your Slidev presentation so slides don't flicker on transition.

## Setup

```bash
npm install slidev-addon-preload-images
```

```yaml
# slides.md
---
addons:
  - slidev-addon-preload-images
---
```

That's it. Images from markdown, HTML, CSS `url()`, and frontmatter (`image`, `background`, etc.) are picked up automatically.

## How it works

1. On load: preloads images from the current slide + next 3 in parallel
2. Then works through the rest of the deck sequentially
3. On navigation: checks that upcoming slides are ready

## Config

Optional, in frontmatter:

```yaml
preloadImages:
  enabled: false  # disable (default: true)
  ahead: 5        # how many slides to preload on startup (default: 3)
```

## Debug

In dev mode, check the console:

```
[preload-images] Found 25 images in 40 slides
[preload-images] Priority slides loaded (1 to 4)
```

## License

MIT
