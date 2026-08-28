import { extendConfig } from "magic-oxlint-config";
import next from "magic-oxlint-config/next";

/**
 * A nested config replaces the root one for everything under `apps/nextjs`, so
 * this file has to be complete on its own. `extendConfig` flattens the preset
 * and the additions below into one config, which is what makes it complete:
 * oxlint's own `extends` still drops the extended config's `ignorePatterns` on
 * 1.75.0 and needs them re-listed by hand.
 *
 * This is the only config in the repo that loads the `magic` jsPlugin.
 * `magic/no-manual-classname` is a Tailwind rule and Tailwind stops at this
 * app — the mobile app styles with Unistyles and `packages/*` has no
 * JSX at all, so loading the plugin there would cost startup time to lint
 * nothing.
 */
export default extendConfig(next, {
  jsPlugins: [{ name: "magic", specifier: "magic-oxlint-plugin" }],

  rules: {
    // Class strings go through `cn` (src/lib/utils.ts, `twMerge(clsx(...))`)
    // or a `cva` variant table. A hand-built one loses the conflict
    // resolution: `p-2 ${active ? "p-4" : ""}` emits both paddings and leaves
    // the winner to stylesheet order, where `cn` keeps the last one.
    "magic/no-manual-classname": "error",
  },
});
