import expo from "magic-oxlint-config/expo";
import { defineConfig } from "oxlint";

/**
 * A nested config replaces the root one for everything under `apps/mobile`, so
 * this file has to be complete on its own — including `ignorePatterns`, which
 * `extends` does not carry over.
 */
export default defineConfig({
  extends: [expo],

  ignorePatterns: [
    ...(expo.ignorePatterns ?? []),
    "google-services.json",
    "GoogleService-Info.plist",
  ],

  rules: {
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
    // Must stay last — see the root config for why.
    {
      files: ["**/__mocks__/**"],
      rules: { "unicorn/filename-case": "off" },
    },
  ],
});
