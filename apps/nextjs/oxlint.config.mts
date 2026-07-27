/**
 * A nested config replaces the root one for everything under `apps/nextjs`, so
 * this file has to be complete on its own. Re-exporting the preset — rather
 * than `defineConfig({ extends: [next] })` — is what makes it complete:
 * `extends` still drops the extended config's `ignorePatterns` on oxlint
 * 1.75.0, so the extends form needs them copied back by hand. The re-export
 * loads the preset as *the* config and every field applies.
 */
export { default } from "magic-oxlint-config/next";
