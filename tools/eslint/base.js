import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { includeIgnoreFile } from "@eslint/compat";
// @ts-ignore - magic-eslint-config doesn't provide TypeScript declarations
import baseConfig from "magic-eslint-config/base";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ignoreFile = includeIgnoreFile(join(__dirname, "../../.gitignore"));

/** @type {import('eslint').Linter.Config[]} */
export default [
  ignoreFile,
  ...baseConfig,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"]
  }
];
