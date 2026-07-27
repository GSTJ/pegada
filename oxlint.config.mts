import base from "magic-oxlint-config/base";
import { defineConfig } from "oxlint";

/**
 * Root config: plain TypeScript. It covers `packages/*`, `tools/*`, `scripts/`
 * and the root config files.
 *
 * The two apps have their own config next to their `package.json`, because
 * oxlint walks up from each file to the nearest config and the presets they
 * need are different (`expo` for mobile, `next` for the site). A nested config
 * *replaces* this one rather than merging with it, so each is self-contained —
 * which is also why `ignorePatterns` is spelled out in all three: `extends`
 * drops the extended config's ignore patterns.
 */
export default defineConfig({
  extends: [base],

  ignorePatterns: [
    ...(base.ignorePatterns ?? []),
    "**/storybook-static/**",
    "patches/**",
    "packages/database/prisma/migrations/**",
    "apps/mobile/google-services.json",
    "apps/mobile/GoogleService-Info.plist",
  ],

  overrides: [
    {
      // Seeds are operator-facing scripts that report progress on stdout, they
      // just don't live under `scripts/`.
      files: ["packages/database/seed.ts", "packages/database/maestro-seed.ts"],
      rules: { "no-console": "off" },
    },
    {
      // The service layer is a set of static-method namespaces
      // (`SuggestionService.suggestFor(...)`). That is this repo's convention
      // for the API's domain services, not a general one.
      files: ["packages/api/src/services/**"],
      rules: { "typescript/no-extraneous-class": "off" },
    },
    {
      // Repeated from the preset because an `overrides[]` entry that omits
      // `plugins` re-activates category rules for the files it matches, and
      // `unicorn/filename-case` is a `style` rule — so the entries above would
      // switch it back on for `__mocks__` from underneath the preset. It only
      // sticks if it is last.
      files: ["**/__mocks__/**"],
      rules: { "unicorn/filename-case": "off" },
    },
  ],
});
