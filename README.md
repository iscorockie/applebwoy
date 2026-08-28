# Applebwoy

Kampala's Apple specialist — a single-page storefront for genuine Apple products, priced in Ugandan Shillings (UGX) with WhatsApp ordering.

## Overview

`index.html` is a self-contained static site (no build step, no dependencies). Open it in a browser or serve the folder:

```bash
python3 -m http.server 8080
```

## What's inside

- **Apple-only catalogue** — 28 products across iPhone, Mac, iPad, Apple Watch, AirPods, Apple TV, HomePod, Vision Pro, AirTag and Accessories.
- **Live Apple Store imagery** — every product photo is served directly from Apple's own CDN (`store.storeimages.cdn-apple.com`), the same asset URLs used on [apple.com/store](https://www.apple.com/store). Images fall back to a neutral placeholder if a URL ever rotates.
- **UGX pricing** — all prices in Ugandan Shillings, converted from Apple US pricing at roughly UGX 3,750/USD plus local import cost, and rounded to realistic Kampala retail figures.
- **WhatsApp checkout** — every Order button opens WhatsApp with the product name and price pre-filled, to `+256 754 011 973`.
- **Live search + category filters** — client-side filtering across the whole catalogue.
- **Deal of the Day** with a rolling countdown timer.
- **Fully responsive** — 4/3/2-column product grid down to mobile, with a hamburger menu.

## Updating prices

Prices live in the `products` array near the top of the `<script>` block. Each entry looks like:

```js
{ id:1, cat:"iPhone", name:"iPhone 17 Pro", desc:"…",
  price:4150000, was:4390000, tag:"hot", rating:4.9, reviews:128, img: card(…) }
```

- `price` — current price in UGX (plain number; formatting is automatic)
- `was` — optional strike-through original price, or `null`
- `tag` — `"new"`, `"hot"`, `"sale"` or `null`
- `cat` — must match one of the entries in the `FILTERS` array

## Note

Applebwoy is an independent reseller and is not affiliated with, endorsed by or sponsored by Apple Inc. Apple, iPhone, iPad, Mac, Apple Watch, AirPods and AirTag are trademarks of Apple Inc. Product images are courtesy of Apple.
