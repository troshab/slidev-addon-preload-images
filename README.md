# slidev-addon-preload-images

> **Deprecated:** Image preloading is now built into Slidev core ([PR #2459](https://github.com/slidevjs/slidev/pull/2459)). This addon is no longer needed.
>
> **Migration:** remove `slidev-addon-preload-images` from your `addons` list in `slides.md` and uninstall the package:
> ```bash
> npm uninstall slidev-addon-preload-images
> ```
> No additional configuration required - `preloadImages: true` is the default in Slidev.

---

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

1. On load: preloads all images in the deck in parallel
2. On navigation: ensures upcoming slides are ready

With `ahead > 0`, preloads a bidirectional window around the current slide first, then the rest sequentially.

## Config

Optional, in frontmatter:

```yaml
preloadImages:
  enabled: false  # disable (default: true)
  ahead: 5        # bidirectional window size (default: 0 = all at once)
```

## Debug

In dev mode, check the console:

```
[preload-images] Found 25 images in 40 slides
[preload-images] All slides preloaded
```

## License

MIT
