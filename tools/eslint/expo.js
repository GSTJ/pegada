import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { includeIgnoreFile } from "@eslint/compat";
import reactNativeConfig from "magic-eslint-config/react-native";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ignoreFile = includeIgnoreFile(join(__dirname, "../../.gitignore"));

/** @type {import('eslint').Linter.Config[]} */
export default [ignoreFile, ...reactNativeConfig];
