import expoConfig from "@pegada/eslint-config/expo";

// Additional ignore patterns specific to the mobile package. These prevent ESLint
// from attempting to parse React-Native's large JS bundles inside node_modules
// as well as local build/config files that are not part of the source.

/** @type {import('eslint').Linter.Config} */
const packageOverrides = {
  ignores: ["**/node_modules/**", "*.config.js", "*.config.mjs", "*.yml"]
};

/** @type {import('typescript-eslint').Config} */
export default [
  ...expoConfig,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-extraneous-class": "off", // That's good, keep it
      "@shopify/jsx-no-hardcoded-content": "off", // That's good, keep it
      "@typescript-eslint/no-confusing-void-expression": "off", // That's good, keep it
      "@typescript-eslint/no-unsafe-enum-comparison": "off", // That's good, keep it
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-misused-promises": "error",
      "react/no-unstable-nested-components": "error",
      "react-native/no-inline-styles": "off", // That's fine, keep it
      "@typescript-eslint/non-nullable-type-assertion-style": "error",
      "import/no-cycle": "off" // This one is fine
    }
  },
  {
    files: ["src/services/config.ts", "app.config.ts"],
    rules: {
      "no-restricted-syntax": "off"
    }
  },
  packageOverrides
];
