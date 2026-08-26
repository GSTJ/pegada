import { extendConfig } from "magic-oxlint-config";
import expo from "magic-oxlint-config/expo";

/**
 * A nested config replaces the root one for everything under `apps/mobile`, so
 * this file has to be complete on its own. `extendConfig` flattens the preset
 * and the additions below into one config, which is what makes it complete:
 * oxlint's own `extends` still drops the extended config's `ignorePatterns` on
 * 1.75.0 and needs them re-listed by hand.
 */
export default extendConfig(expo, {
  ignorePatterns: ["google-services.json", "GoogleService-Info.plist"],

  rules: {
    // See the root config: a nested config replaces the root one outright, so
    // repo-wide decisions have to be restated here.
    "no-warning-comments": "off",

    // The preset bans namespace imports and allows `react` / `@radix-ui/*`.
    // Per-rule config replaces rather than merges, so `react` is restated.
    //
    // Two additions, both cases where the namespace *is* the documented API:
    // every `expo-*` module exports only named functions and the SDK docs are
    // written as `import * as Notifications from "expo-notifications"`, and a
    // a `styles.ts` module next to a component is this repo's convention —
    // `S.Container` is how you tell a styled node from a real one.
    "import/no-namespace": [
      "error",
      { ignore: ["react", "expo-*", "**/styles"] },
    ],

    // The React Compiler rule is `nursery`, and DECISIONS.md in the magic repo
    // says to switch it off locally rather than fight it. Everything it reports
    // here is a bailout on a library this app is built on and none of it is a
    // bug: reanimated shared-value writes (`Immutability: This value cannot be
    // modified`), react-native-gesture-handler's `Gesture.Pan()` factories
    // (`CapitalizedCalls`), and react-hook-form (`Compilation Skipped: Use of
    // incompatible library`). The compiler itself already skips these
    // components at build time; the lint rule only restates that as an error.
    "react/react-compiler": "off",

    // react-native-gesture-handler ships its own scrollables for use *inside*
    // gesture-handler containers. Importing them anywhere else silently loses
    // the platform behaviour of the react-native originals.
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "react-native-gesture-handler",
            importNames: ["ScrollView", "FlatList", "SectionList"],
            message:
              "Import ScrollView/FlatList/SectionList from react-native instead.",
          },
        ],
      },
    ],
  },

  overrides: [
    {
      // This is the app's env boundary: the one module that reads
      // `process.env.EXPO_PUBLIC_*` and hands back a zod-parsed object. The
      // preset exempts `env.ts`; here the file is called `config.ts`.
      files: ["src/services/config.ts"],
      rules: { "no-restricted-properties": "off" },
    },
    {
      // Expo config plugins and native target configs run in the build
      // toolchain, not in the app: CommonJS, and they log.
      files: ["plugins/**", "targets/**"],
      rules: {
        "no-console": "off",
        "typescript/no-require-imports": "off",
        "import/no-default-export": "off",
        "func-style": "off",
      },
    },
    {
      // Maestro post-checks are CLI scripts, not app code: they run under
      // plain node against a booted device, read the harness's environment
      // directly (there is no validated env module out here) and report by
      // printing.
      files: [".maestro/**"],
      rules: {
        "no-console": "off",
        "no-restricted-properties": "off",
      },
    },
    // Must stay last — see the root config for why.
    {
      files: ["**/__mocks__/**"],
      rules: { "unicorn/filename-case": "off" },
    },
  ],
});
