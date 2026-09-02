import localFont from "next/font/local";

/**
 * The app is set in Gilroy (see `packages/shared/themes/themes.ts`); the rest
 * of this site is Epilogue (`src/app/layout.tsx`). Loaded here rather than in
 * the root layout, so only the pages that exist to look like the app they are
 * advertising pay for it: the dog share card and the story landing page.
 *
 * The weights below are the ones those pages set: body copy in medium, CTAs
 * and taglines in semibold, headlines in bold/extrabold.
 *
 * The TTFs live in `packages/shared/themes/fonts`, outside this app. That path
 * survives `next build` (verified via `pnpm -F @pegada/nextjs build`), so there
 * was no need to duplicate the files under `src/fonts`.
 */
export const gilroy = localFont({
  variable: "--font-gilroy",
  display: "swap",
  src: [
    {
      path: "../../../../packages/shared/themes/fonts/Gilroy-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../../packages/shared/themes/fonts/Gilroy-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../../packages/shared/themes/fonts/Gilroy-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../../packages/shared/themes/fonts/Gilroy-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
  ],
});
