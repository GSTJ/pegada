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
      "@typescript-eslint/no-extraneous-class": "off", // That's good, keep it
      "@shopify/no-namespace-imports": "off",
      "@shopify/jsx-no-hardcoded-content": "off", // That's good, keep it
      "@shopify/prefer-early-return": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off", // That's good, keep it
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-invalid-void-type": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "react/no-unstable-nested-components": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-native/no-inline-styles": "off", // That's fine, keep it
      "@typescript-eslint/non-nullable-type-assertion-style": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/no-misused-spread": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "import/no-cycle": "off", // This one is fine
      "no-restricted-syntax": "off",
      "react-compiler/react-compiler": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off"
    }
  },
  packageOverrides
];
