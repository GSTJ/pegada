import baseConfig from "@pegada/eslint-config/base";

// Additional package-specific configuration for the database package.
// The `__mocks__` folder contains test helpers that intentionally violate some
// of our stricter lint rules (e.g. they rely on fixtures, non-null assertions,
// etc.). To keep the main codebase tidy while not compromising on test
// ergonomics, we simply exclude those files from the lint process.
//
// We also exclude `.yml` files because they are configuration/infra scripts,
// not TypeScript source.

/** @type {import('eslint').Linter.Config} */
const packageOverrides = {
  ignores: ["__mocks__/**/*", "**/*.yml"]
};

/** @type {import('typescript-eslint').Config} */
export default [...baseConfig, packageOverrides];
