import localFont from "next/font/local";

/**
 * The app is set in Gilroy (see `packages/shared/themes/themes.ts`); the
 * rest of this site is Epilogue (`src/app/layout.tsx`). Loaded here, not in
 * the root layout, so only the share page — which exists to look like the
 * app it is advertising — pays for it. The weights below are the ones this
 * page actually sets: body copy in medium, the CTA and tagline in semibold,
 * the dog's name and headline in bold/extrabold.
 *
 * The TTFs live in `packages/shared/themes/fonts`, outside this app. That
 * path survives `next build` (verified via `pnpm -F @pegada/nextjs build`),
 * so there was no need to duplicate the files under `src/fonts`.
 */
export const gilroy = localFont({
  variable: "--font-gilroy",
  display: "swap",
  src: [
    {
      path: "../../../../../../../packages/shared/themes/fonts/Gilroy-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../../../../packages/shared/themes/fonts/Gilroy-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../../../../packages/shared/themes/fonts/Gilroy-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../../../../../packages/shared/themes/fonts/Gilroy-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
  ],
});
