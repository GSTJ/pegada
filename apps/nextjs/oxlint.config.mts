import next from "magic-oxlint-config/next";
import { defineConfig } from "oxlint";

/**
 * A nested config replaces the root one for everything under `apps/nextjs`, so
 * this file has to be complete on its own — including `ignorePatterns`, which
 * `extends` does not carry over.
 */
export default defineConfig({
  extends: [next],

  ignorePatterns: [...(next.ignorePatterns ?? [])],
});
