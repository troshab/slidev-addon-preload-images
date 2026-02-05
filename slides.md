---
theme: default
addons:
  - ./
preloadImages:
  ahead: 3
  urls:
    - https://sli.dev/logo.png
---

# slidev-addon-preload-images

Demo presentation

---

# How It Works

Images from upcoming slides are preloaded automatically.

- Zero configuration required
- Configurable lookahead (default: 3 slides)
- Smart image extraction from markdown, HTML, CSS

---

# Markdown Images

![Slidev Logo](https://sli.dev/logo.png)

This image was preloaded on the previous slide!

---

# HTML Images

<img src="https://sli.dev/favicon.png" class="w-32 h-32" />

Also preloaded automatically.

---

# Manual Preloading

Use the component for explicit control:

```vue
<PreloadImages :urls="['/heavy-image.png']" />
```

---
layout: center
---

# Thank You!

[GitHub](https://github.com/troshab/slidev-addon-preload-images)
