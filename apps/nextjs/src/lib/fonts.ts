import localFont from "next/font/local";

/**
 * Gilroy is the app's own face (`packages/shared/themes/fonts`), and the whole
 * site is set in it. These are those TTFs subset to Latin (which covers every
 * pt-BR accent) and converted to woff2, about 23KB a weight instead of 140KB.
 * The TTFs stay where they are for the OG image routes: satori cannot read
 * woff2.
 *
 * Light is only here for `/dog/[id]`, which sets the card bio and the lines
 * around the CTA in it. Semibold is the story page's button weight.
 */
export const gilroy = localFont({
  variable: "--font-gilroy",
  display: "swap",
  src: [
    { path: "../fonts/gilroy-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/gilroy-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/gilroy-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/gilroy-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/gilroy-800.woff2", weight: "800", style: "normal" },
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
