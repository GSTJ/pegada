import { defineConfig } from "tsup";

import pkg from "./package.json";

export default defineConfig((options) => ({
  entry: ["index.ts", "src"],
  noExternal: !options.watch
    ? Object.keys(pkg.dependencies).filter((s) => s.includes("@pegada"))
    : undefined,
  format: ["esm"],
  loader: {
    ".hbs": "copy"
  }
}));
