import localFont from "next/font/local";

/**
 * Gilroy, the app's own face, and the whole site is set in it. These are the
 * TTFs in `packages/shared/themes/fonts` (which stay there for the satori OG
 * images, satori cannot read woff2) cut down to Latin, about 23KB a weight:
 *
 *   python3 -m fontTools.subset Gilroy-<Weight>.ttf --flavor=woff2 \
 *     --layout-features='*' --unicodes=U+0020-00FF,U+0131,U+0152-0153,U+02C6,\
 *     U+02DA,U+02DC,U+2013-2014,U+2018-201E,U+2020-2022,U+2026,U+2030,\
 *     U+2039-203A,U+2044,U+20AC,U+2122,U+2190-2193,U+2212
 *
 * Two calls, one family: next/font preloads every file of a call, and only the
 * headline's 700 is worth a preload. The rest load when text set in them is
 * on screen. The family is named `Gilroy` so the landing CSS can say so.
 */
export const gilroyBold = localFont({
  variable: "--font-gilroy-bold",
  display: "swap",
  declarations: [{ prop: "font-family", value: "Gilroy" }],
  // The fallback metrics come from the call below.
  adjustFontFallback: false,
  src: [{ path: "../fonts/gilroy-700.woff2", weight: "700", style: "normal" }],
});

export const gilroy = localFont({
  variable: "--font-gilroy",
  display: "swap",
  preload: false,
  declarations: [{ prop: "font-family", value: "Gilroy" }],
  src: [
    { path: "../fonts/gilroy-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/gilroy-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/gilroy-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/gilroy-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/gilroy-800.woff2", weight: "800", style: "normal" },
  ],
});
