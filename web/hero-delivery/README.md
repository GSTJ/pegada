# web/hero-delivery — evidence

Backs PR #114, "perf(web): serve the hero through next/image and right-size the
icons" (branch `web/hero-delivery`, pegada-web wave 1, PR 3/4).

Everything here was measured locally against two production builds running side
by side: `main` at 19b8d55 on port 3311, the PR branch on 3313. Same machine,
same session, `next build` + `next start` for both.

## Asset sizes

| asset | before | after | delta |
| --- | --- | --- | --- |
| hero mockup | `public/phone-mockup.png`, 3924x7620, 4,924,610 B (4,809 KB) | `public/phone-mockup.webp`, 1308x2540, 160,498 B (157 KB) | -96.7% |
| favicon | `public/favicon.ico`, one 245x256 frame, 259,134 B (253 KB) | `public/favicon.ico`, 16/32/48 frames, 15,086 B (14.7 KB) | -94.2% |
| icon set (new files) | none | favicon-16x16 535 B, favicon-32x32 1,195 B, icon-192 5,951 B, icon-512 15,266 B, apple-touch-icon 3,577 B | +26,524 B |
| icons total | 259,134 B | 41,610 B | -84.0% |

Only one icon is fetched on a page load (`/favicon.ico`); the rest resolve on
demand for home-screen and touch-icon surfaces. Lighthouse's network log
confirms it: 19,492 B transferred before, 7,401 B after.

## What the browser actually downloads for the hero

Measured from the Playwright response log, one cold load per row.

| viewport | DPR | srcset variant picked | hero bytes before | hero bytes after | page total before | page total after |
| --- | --- | --- | --- | --- | --- | --- |
| desktop 1440x900 | 1 | w=640 | 4,924,610 | 61,270 | 4,962,236 | 98,896 |
| desktop 1440x900 | 2 | w=828 | 4,924,610 | 86,088 | 4,962,236 | 123,714 |
| mobile 390x844 | 1 | w=384 | 4,924,610 | 31,658 | 4,962,236 | 69,284 |
| mobile 390x844 | 2 | w=828 | 4,924,610 | 86,088 | 4,962,236 | 123,714 |
| mobile 390x844 | 3 | w=1200 | 4,924,610 | 130,082 | 4,962,236 | 167,708 |

DPR 3 is the real iPhone 12/13/14/15 case for a 390x844 viewport.

## Lighthouse, mobile, median of 3

`npx lighthouse@12 --form-factor=mobile --screenEmulation.mobile
--only-categories=performance`, headless Chrome. Raw reports in `lighthouse/`.

| metric | before | after | delta |
| --- | --- | --- | --- |
| Performance score | 96 | 99 | +3 |
| LCP | 2,719 ms | 2,107 ms | -612 ms (-22.5%) |
| Total byte weight | 5,192,562 B | 331,766 B | -93.6% |
| FCP | 757 ms | 756 ms | -1 ms |
| Speed Index | 757 ms | 756 ms | -1 ms |
| TBT | 30 ms | 12 ms | -18 ms |
| CLS | 0.000 | 0.000 | 0 |

Per-run, so the spread is visible:

| run | before score / LCP | after score / LCP |
| --- | --- | --- |
| 1 | 96 / 2719 ms | 100 / 1138 ms |
| 2 | 96 / 2716 ms | 99 / 2107 ms |
| 3 | 96 / 2721 ms | 99 / 2107 ms |

After-run 1 caught a fully warm optimiser cache. The two 2107 ms runs are the
conservative reading and the median takes one of them.

## Layout is identical, to the sub-pixel

The hero's box rect, read off `getBoundingClientRect()` on both builds, at every
viewport and DPR measured. Full JSON in `screenshots/geometry-and-bytes-*.json`.

| viewport | DPR | box (before and after) | delta w | delta x | document height |
| --- | --- | --- | --- | --- | --- |
| desktop 1440x900 | 1 | 393.93750 x 765.00000 @ x=867.03125 | 0.000000 | 0.000000 | 900 -> 900 |
| desktop 1440x900 | 2 | 393.93750 x 765.00000 @ x=867.03125 | 0.000000 | 0.000000 | 900 -> 900 |
| mobile 390x844 | 1 | 369.42188 x 717.39062 @ x=10.28125 | 0.000000 | 0.000000 | 1725 -> 1725 |
| mobile 390x844 | 2 | 369.42188 x 717.39062 @ x=10.28125 | 0.000000 | 0.000000 | 1725 -> 1725 |
| mobile 390x844 | 3 | 369.42188 x 717.39062 @ x=10.28125 | 0.000000 | 0.000000 | 1725 -> 1725 |

That zero is what `aspect-[327/635]` buys. Without it a responsive `<img>` takes
its ratio from the density-corrected natural size of whichever srcset candidate
loaded, the optimiser's integer-rounded variant heights are off 327:635 by up to
a pixel, and the shrink-to-fit box moves 0.06-0.16 CSS px depending on DPR. The
crop follows from the same fact: `object-cover`'s crop is a function of the box
ratio against the source ratio, and both are unchanged.

## Pixel diff of the hero region

Same clip rect on both builds (identical, see the JSON), captured in a scrolled
viewport rather than a `fullPage` shot. Expanding the viewport for a full-page
screenshot changes what `sizes: 45vh` resolves to and makes the browser swap
candidates mid-capture.

| hero region | px compared | RMSE | PSNR dB | DSSIM | differing px @2% | @5% | @10% |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop-1440x900@1x | 306,062 (398x769) | 0.01223 | 38.25 | 0.00705 | 482 (0.158%) | 144 (0.047%) | 32 (0.011%) |
| desktop-1440x900@2x | 1,224,248 (796x1538) | 0.00942 | 40.52 | 0.00754 | 1088 (0.089%) | 207 (0.017%) | 0 (0.000%) |
| mobile-390x844@1x | 270,028 (374x722) | 0.04587 | 26.77 | 0.02441 | 2219 (0.822%) | 1702 (0.631%) | 1244 (0.461%) |
| mobile-390x844@2x | 1,080,112 (748x1444) | 0.00910 | 40.82 | 0.00749 | 814 (0.075%) | 138 (0.013%) | 25 (0.002%) |
| mobile-390x844@3x | 2,430,252 (1122x2166) | 0.01014 | 39.88 | 0.00816 | 2456 (0.101%) | 791 (0.033%) | 17 (0.001%) |

`hero-compare-fuzz5--*.png` is `magick compare -fuzz 5%`, red on white: what's
left after ignoring deltas under 5%. Thin edge outlines and nothing else, no
doubled or offset geometry, which is the signature of a resample.
`hero-diffmap-8x--*.png` is `|before - after|` amplified 8x on grey.

mobile-390x844@1x is the weak row at 26.77 dB. A 390x844 CSS viewport at DPR 1
doesn't ship on any phone (that viewport is an iPhone 12/13/14/15, always DPR 3),
but at 369 device px the old build was supersampling a 3924px source and a 384px
WebP can't match that on the thin UI strokes inside the mockup. The >20% deltas
are all in one place, the "Maui, 1 ano e 7 meses" line and the three emoji and
the tab bar, and they come to 0.30% of the region. The photograph itself is
indistinguishable at 3x zoom. Every real-device path measures 38.3-40.8 dB.

Reproduce:

```
node shoot.js                # per-viewport geometry, bytes, screenshots
./diff.sh                    # the table above
./lh.sh <label> <port>       # three lighthouse runs
```
