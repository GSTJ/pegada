import base from "magic-oxfmt-config";

/**
 * One formatter config for the whole monorepo — oxfmt has the same nearest-wins
 * nesting as oxlint, but nothing here needs per-app formatting, so keeping it
 * at the root keeps `oxfmt .` honest.
 *
 * Spread into a new object rather than re-exported, because the extra ignore
 * patterns below have to be merged with the package's own.
 */
const config = {
  ...base,
  ignorePatterns: [
    ...(base.ignorePatterns ?? []),
    // From magic-oxfmt-config's `expo` and `next` variants: this repo has both
    // an Expo app and a Next app under one root config.
    "**/ios/**",
    "**/android/**",
    "**/Pods/**",
    "**/DerivedData/**",
    "**/*.pbxproj",
    "**/expo-env.d.ts",
    "**/out/**",
    "**/next-env.d.ts",
    // Workflow JSON/JS embedded in .github, plus the Maestro flows and the
    // generated native config files, are not ours to reformat.
    ".github/**",
    "patches/**",
    "apps/mobile/google-services.json",
    "apps/mobile/GoogleService-Info.plist",
    // Xcode asset catalogs. @bacons/apple-targets writes these from the
    // `colors` map in expo-target.config.js and Xcode rewrites them on edit,
    // so the JSON inside is theirs to shape, not ours.
    "**/*.xcassets/**",
    "packages/database/prisma/migrations/**",
    // The one-shot styled-components -> unistyles codemod. It lives outside the
    // pnpm workspace with its own npm install, and every `apply.sh` run
    // rewrites `report.json` and the `manual/*.json` ledgers, so a formatter
    // pointed at it would be permanently one run behind. It goes when the
    // migration is done.
    ".unistyles-codemod/**",
  ],
};

export default config;
