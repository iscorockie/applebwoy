# Applebwoy

Kampala's Apple specialist — a single-page storefront for genuine Apple products, priced in Ugandan Shillings (UGX) with WhatsApp ordering.

**Live:** https://iscorockie.github.io/applebwoy/

## Overview

`index.html` is a self-contained static site — no build step, no dependencies, no external requests. Open it directly or serve the folder:

```bash
python3 -m http.server 8080
```

## What's inside

- **Apple-only catalogue** — 28 products across iPhone, Mac, iPad, Apple Watch, AirPods, Apple TV, HomePod, Vision Pro, AirTag and Accessories.
- **Self-hosted imagery** — every image is committed under `assets/products/` (~150KB total). Nothing is hotlinked, so the site works offline and can't break when a CDN URL rotates.
- **Real Kampala pricing** — prices benchmarked against Uganda Apple resellers (Apple Center Uganda, iStore Uganda, Andrew Gadgets, Jiji) in August 2026, not converted from US RRP.
- **WhatsApp checkout** — every Order button opens WhatsApp with product name and price pre-filled, to `+256 754 011 973`.
- **Live search + category filters**, star ratings, deal countdown, and a fully responsive 4/3/2-column grid.

## Product images

The committed artwork is a mix of studio renders (`.webp`) and hand-built vector illustrations (`.svg`) — clean, uniform, white-background catalogue shots.

To replace them with **Apple's official product photography** from `apple.com/store`, run this on any machine with normal internet access:

```bash
node tools/fetch-apple-images.mjs          # download + rewrite index.html
node tools/fetch-apple-images.mjs --check  # dry run: just test reachability
```

Requires Node 18+. If `cwebp` is on your PATH the downloads are compressed to WebP automatically. The script rewrites the image paths in `index.html` and deletes the superseded placeholders, so afterwards just review and commit.

> This exists because the environment the site was authored in had no network route to Apple's CDN. The URLs in the script are the real ones published on apple.com/store.

## Updating prices

Prices live in the `products` array inside the `<script>` block:

```js
{ id:1, cat:"iPhone", name:"iPhone 17 Pro (256GB)", desc:"…",
  price:4780000, was:5100000, tag:"hot", rating:4.9, reviews:128,
  img:"assets/products/iphone-17-pro.webp" }
```

- `price` — current price in UGX (plain number; commas are added automatically)
- `was` — optional strike-through original price, or `null`
- `tag` — `"new"`, `"hot"`, `"sale"` or `null`
- `cat` — must match an entry in the `FILTERS` array

## Deployment

GitHub Pages serves the repository root of `main`. Any push to `main` redeploys within a minute. `.nojekyll` is present so paths starting with underscores are served correctly.

## Note

Applebwoy is an independent reseller and is not affiliated with, endorsed by or sponsored by Apple Inc. Apple, iPhone, iPad, Mac, Apple Watch, AirPods and AirTag are trademarks of Apple Inc.
