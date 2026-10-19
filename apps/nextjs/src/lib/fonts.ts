import localFont from "next/font/local";

/**
 * Gilroy is the app's own face (`packages/shared/themes/fonts`), and the whole
 * site is set in it. These are those TTFs subset to Latin (which covers every
 * pt-BR accent) and converted to woff2, about 23KB a weight instead of 140KB.
 * The TTFs stay where they are for the OG image routes: satori cannot read
 * woff2.
 *
 * Two calls, one family: next/font preloads every file of a call, and five
 * preloaded weights were sharing a phone's bandwidth with the hero photo (the
 * LCP). Only the hero headline's 800 is preloaded; the rest are fetched when
 * a page actually sets text in them. Every weight here is in use somewhere:
 * light on `/dog/[id]` and the error pages, 500 for body text (400 resolves to
 * it), 600 for buttons, 700 and 800 for headings. The family name is written
 * out twice because next/font only accepts literals.
 */
export const gilroyDisplay = localFont({
  variable: "--font-gilroy-display",
  display: "swap",
  declarations: [{ prop: "font-family", value: "Gilroy" }],
  // The fallback metrics come from the call below, which has the body weight.
  adjustFontFallback: false,
  src: [{ path: "../fonts/gilroy-800.woff2", weight: "800", style: "normal" }],
});

export const gilroy = localFont({
  variable: "--font-gilroy",
  display: "swap",
  preload: false,
  declarations: [{ prop: "font-family", value: "Gilroy" }],
  src: [
    { path: "../fonts/gilroy-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/gilroy-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/gilroy-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/gilroy-700.woff2", weight: "700", style: "normal" },
  ],
});

/**
 * DM Mono (OFL) for machine data only: the MRZ line on the dog's ID card and
 * numeric readouts. Never preloaded, nothing above the fold is set in it.
 */
export const dmMono = localFont({
  variable: "--font-mono",
  display: "swap",
  preload: false,
  src: [{ path: "../fonts/dm-mono-500.woff2", weight: "500", style: "normal" }],
});
