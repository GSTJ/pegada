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
    "packages/database/prisma/migrations/**",
  ],
};

export default config;
