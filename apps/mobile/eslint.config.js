import expoConfig from "@pegada/eslint-config/expo";

// Additional ignore patterns specific to the mobile package. These prevent ESLint
// from attempting to parse React-Native's large JS bundles inside node_modules
// as well as local build/config files that are not part of the source.

/** @type {import('eslint').Linter.Config} */
const packageOverrides = {
  ignores: [
    "**/node_modules/**",
    "node_modules/**",
    "babel.config.js",
    "metro.config.js"
  ]
};

/** @type {import('typescript-eslint').Config} */
export default [...expoConfig, packageOverrides];
