import baseConfig from "@pegada/eslint-config/base";

/** @type {import('eslint').Linter.Config} */
const packageOverrides = {
  ignores: ["node_modules/**", "*.config.js", "*.config.mjs", "*.yml"]
};

/** @type {import('typescript-eslint').Config} */
export default [...baseConfig, packageOverrides];
