# Meshwar · مشوار — Brand assets

The mark is the **meshwar** itself: a dashed route running from an **origin dot**
(the restaurant) to a **destination pin** (the customer), on the lilac gradient.

| File | Use |
|---|---|
| `meshwar-icon.svg` | App icon / avatar / favicon (square, 512). |
| `meshwar-wordmark.svg` | Horizontal logo — mark + "Meshwar مشوار". |

**Palette:** brand gradient `#7C5CFF → #9D7BFF → #B79BFF`, ink `#1A1730`,
muted `#8B86A3`, ground `#F4F2FB`.

## Generating platform icons

**Web:** already wired — `dashboard/public/favicon.svg`.

**Flutter launcher icon** (needs a PNG). Rasterize once, then use
`flutter_launcher_icons`:
```bash
# rasterize (any SVG tool, e.g. rsvg-convert or Inkscape)
rsvg-convert -w 1024 -h 1024 brand/meshwar-icon.svg -o mobile/flutter/assets/icon.png
# pubspec: flutter_launcher_icons: { image_path: assets/icon.png }
dart run flutter_launcher_icons
```
