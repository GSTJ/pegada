# web/content-sections

Evidence for `web/content-sections` (Pegada web, Wave 2, PR 6): the features
and how-it-works sections added below the fold on `/[locale]`.

All captures come from `next dev` on `localhost`, Chromium via Playwright,
`deviceScaleFactor: 2`. Desktop is 1440x900, mobile is 390x844. The Product
Hunt badge in the hero is fetched from `api.producthunt.com`, so it is live in
every shot.

## Files

- `full-desktop-en.png`, `full-desktop-pt-BR.png` — whole page at 1440 wide,
  hero through the last section. These double as the stitched long screenshot.
- `full-mobile-en.png`, `full-mobile-pt-BR.png` — same at 390 wide.
- `scroll-through-desktop-en.gif` — 90 frames, hero to the bottom of
  how-it-works, held at both ends. Shows the pawprint trail resolving into a
  walk as the section enters the viewport.
- `hero-diff-desktop.png`, `hero-diff-mobile.png` — the hero viewport before
  (`web/banner-copy`, 67a4f88) and after (`web/content-sections`), per locale,
  labelled `diff: none`.

## The hero claim

`before` was captured by stashing the branch's changes against the same running
dev server, so the two shots differ only by the diff under test. Compared with
`magick compare -metric AE`:

```
hero desktop en      0 differing pixels  (of 5,184,000)
hero desktop pt-BR   0 differing pixels  (of 5,184,000)
hero mobile  en      0 differing pixels  (of 2,633,280)
hero mobile  pt-BR   0 differing pixels  (of 2,633,280)
```

Expected: the sections are appended as siblings after `<Restricter>`, and the
hero's inner wrapper is `min-h-screen`, so nothing about the first screen moves.
