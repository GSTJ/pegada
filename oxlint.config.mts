import { extendConfig } from "magic-oxlint-config";
import base from "magic-oxlint-config/base";

/**
 * Root config: plain TypeScript. It covers `packages/*`, `tools/*`, `scripts/`
 * and the root config files.
 *
 * The two apps have their own config next to their `package.json`, because
 * oxlint walks up from each file to the nearest config and the presets they
 * need are different (`expo` for mobile, `next` for the site). A nested config
 * *replaces* this one rather than merging with it, so each is self-contained.
 *
 * `extendConfig` rather than oxlint's own `extends`: it flattens the preset and
 * the additions below into one config, so `ignorePatterns`, `plugins` and
 * `jsPlugins` all land at the top level. `extends` still drops the extended
 * config's `ignorePatterns` on oxlint 1.75.0 — verified against 1.1.0 — which
 * meant re-listing them by hand here and getting it wrong silently.
 */
export default extendConfig(base, {
  ignorePatterns: [
    ".unistyles-codemod/**",
    "**/storybook-static/**",
    "patches/**",
    "packages/database/prisma/migrations/**",
    "apps/mobile/google-services.json",
    "apps/mobile/GoogleService-Info.plist",
  ],

  rules: {
    // `pedantic` turns this on, which means "no TODO comments anywhere". This
    // repo uses them as durable notes pinned to the code they describe — the
    // 1000-day JWT in packages/api/src/trpc.ts is the clearest example. The
    // only ways to satisfy the rule are deleting the note or rewording it to
    // dodge the keyword, and both are worse than leaving the marker greppable.
    "no-warning-comments": "off",

    // `packages/shared` is bundled into the mobile app by Metro, which does
    // not tree-shake: one `import { isBefore } from "date-fns"` in here drags
    // all 824 date-fns modules (2.0 MB) into the app bundle. Deep specifiers
    // (`date-fns/isBefore`) resolve to one module. Restated in
    // apps/mobile/oxlint.config.mts, which replaces this file for the app.
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "date-fns",
            message:
              'Deep-import instead: `import { format } from "date-fns/format"`. The barrel ships all 824 modules.',
          },
          {
            name: "date-fns/locale",
            message:
              'Deep-import instead: `import { pt } from "date-fns/locale/pt"`. The barrel ships every locale.',
          },
          {
            name: "lodash",
            message:
              'Deep-import instead: `import get from "lodash/get"`. The barrel is one 563 KB module.',
          },
        ],
      },
    ],
  },

  overrides: [
    {
      // Seeds are operator-facing scripts that report progress on stdout, they
      // just don't live under `scripts/`.
      files: ["packages/database/seed.ts", "packages/database/maestro-seed.ts"],
      rules: {
        "no-console": "off",
        // Seeding is deliberately sequential: every row depends on the one
        // before it (a dog needs its user, an interest needs both dogs), and
        // one connection writing in order is what keeps a re-run idempotent.
        "no-await-in-loop": "off",
      },
    },
    {
      // The API's env boundary: the one module that reads process.env and
      // hands back a zod-parsed object. The preset exempts `env.ts`; here the
      // file is called `config.ts`.
      files: ["packages/api/src/shared/config.ts"],
      rules: { "no-restricted-properties": "off" },
    },
    {
      // The service layer is a set of static-method namespaces
      // (`SuggestionService.suggestFor(...)`). That is this repo's convention
      // for the API's domain services, not a general one.
      files: ["packages/api/src/services/**"],
      rules: {
        "typescript/no-extraneous-class": "off",
        // Same convention, reported by the other plugin.
        "unicorn/no-static-only-class": "off",
      },
    },
    {
      // The error taxonomy is one module on purpose: `IntentionalError` and
      // its four subclasses are read together and the client branches on their
      // shared `error_code`. One class per file would be five files that only
      // make sense opened at once.
      files: ["**/errors/errors.ts"],
      rules: { "max-classes-per-file": "off" },
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
