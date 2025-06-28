import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { includeIgnoreFile } from "@eslint/compat";
import nextjsConfig from "magic-eslint-config/next";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ignoreFile = includeIgnoreFile(join(__dirname, "../../.gitignore"));

/** @type {import('eslint').Linter.Config[]} */
export default [ignoreFile, ...nextjsConfig];
