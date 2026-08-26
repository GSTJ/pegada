#!/usr/bin/env node
// Idempotent half of the migration: everything that is NOT a per-file source
// transform. Adds the runtime deps, rewires babel, writes src/unistyles.ts,
// boots it from index.js, adds the UnistylesThemes augmentation and bridges
// the existing ThemeProvider into UnistylesRuntime.
//
// Safe to run repeatedly; every step checks for its own output first.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const mobile = path.join(repoRoot, "apps", "mobile");

const DEPS = {
  "@react-native/normalize-colors": "0.83.6",
  "react-native-edge-to-edge": "1.8.1",
  "react-native-nitro-modules": "0.36.5",
  "react-native-unistyles": "3.2.5",
};

const log = (step, detail) => console.log(`[setup] ${step}${detail ? ` — ${detail}` : ""}`);

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);

/* 1. dependencies -------------------------------------------------------- */
function addDeps() {
  const pkgPath = path.join(mobile, "package.json");
  const pkg = JSON.parse(read(pkgPath));
  let changed = false;

  for (const [name, version] of Object.entries(DEPS)) {
    if (pkg.dependencies[name] === version) continue;
    pkg.dependencies[name] = version;
    changed = true;
  }

  if (!changed) return log("deps", "already present");

  pkg.dependencies = Object.fromEntries(
    Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)),
  );
  write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  log("deps", Object.keys(DEPS).join(", "));
}

/* 2. babel --------------------------------------------------------------- */
// The unistyles plugin has to run before react-compiler (which comes out of
// babel-preset-expo) and reanimated's plugin has to stay last, so the only
// valid slot is the head of the top-level plugin list.
const BABEL = `module.exports = (api) => {
  api.cache(true);

  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // NOTE: this plugin MUST be first — it has to see the untouched
      // StyleSheet.create calls before react-compiler (pulled in by
      // babel-preset-expo) rewrites the components around them.
      ["react-native-unistyles/plugin", { root: "src" }],
      "babel-plugin-styled-components",
      "react-native-reanimated/plugin", // NOTE: this plugin MUST be last
    ],
  };
};
`;

function patchBabel() {
  const p = path.join(mobile, "babel.config.js");
  if (read(p) === BABEL) return log("babel", "already patched");
  write(p, BABEL);
  log("babel", "unistyles plugin hoisted to first");
}

/* 3. src/unistyles.ts ---------------------------------------------------- */
const UNISTYLES = `import { Appearance } from "react-native";

import { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";
import { StyleSheet } from "react-native-unistyles";

/**
 * Unistyles' theme registry. The React tree's ThemeProvider
 * (\`src/contexts/theme-provider.tsx\`) stays the source of truth for which
 * theme is active — it mirrors every change here through
 * \`UnistylesRuntime.setTheme\`. That is also why \`adaptiveThemes\` is off:
 * it and \`initialTheme\` are mutually exclusive, and letting Unistyles follow
 * the system scheme on its own would fight the stored user override.
 *
 * Imported for its side effect as the very first line of \`index.js\`, before
 * anything can call \`StyleSheet.create\`.
 */
export const appThemes = {
  light: LightTheme,
  dark: DarkTheme,
};

StyleSheet.configure({
  themes: appThemes,
  settings: {
    // ThemeProvider resolves the stored override asynchronously; the system
    // scheme is the right first paint until it does.
    initialTheme: () =>
      Appearance.getColorScheme() === "dark" ? "dark" : "light",
  },
});
`;

function writeUnistyles() {
  const p = path.join(mobile, "src", "unistyles.ts");
  if (fs.existsSync(p) && read(p) === UNISTYLES) return log("unistyles.ts", "already written");
  write(p, UNISTYLES);
  log("unistyles.ts", "written");
}

/* 4. index.js boot ------------------------------------------------------- */
function patchIndex() {
  const p = path.join(mobile, "index.js");
  const src = read(p);
  if (src.includes("./src/unistyles")) return log("index.js", "already boots unistyles");
  write(p, `import "./src/unistyles";\n${src}`);
  log("index.js", "unistyles imported first");
}

/* 5. type augmentation --------------------------------------------------- */
const TYPES = `import type { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";

type AppThemes = {
  light: typeof LightTheme;
  dark: typeof DarkTheme;
};

declare module "react-native-unistyles" {
  // oxlint-disable-next-line typescript/no-empty-object-type -- the whole point
  // of the augmentation is to graft the app themes onto Unistyles' empty
  // interface; an empty body is how the library asks for it.
  export interface UnistylesThemes extends AppThemes {}
}
`;

function writeTypes() {
  const p = path.join(mobile, "src", "types", "unistyles.d.ts");
  if (fs.existsSync(p) && read(p) === TYPES) return log("unistyles.d.ts", "already written");
  write(p, TYPES);
  log("unistyles.d.ts", "written");
}

/* 6. ThemeProvider bridge ------------------------------------------------ */
const BRIDGE = `
  // Unistyles keeps its own theme registry, outside React. This provider stays
  // the source of truth (it owns the stored override), so every resolved theme
  // is mirrored into the runtime — otherwise \`StyleSheet.create\` styles would
  // keep following the system scheme while styled-components followed the user.
  useEffect(() => {
    UnistylesRuntime.setTheme(theme.dark ? "dark" : "light");
  }, [theme]);
`;

function patchThemeProvider() {
  const p = path.join(mobile, "src", "contexts", "theme-provider.tsx");
  let src = read(p);
  if (src.includes("UnistylesRuntime.setTheme")) return log("theme-provider", "already bridged");

  const importAnchor = `import { ThemeProvider as StyledThemeProvider } from "styled-components/native";`;
  if (!src.includes(importAnchor)) throw new Error("theme-provider: import anchor not found");
  src = src.replace(
    importAnchor,
    `${importAnchor}\nimport { UnistylesRuntime } from "react-native-unistyles";`,
  );

  const effectAnchor = `  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(sendError);
  }, [theme]);
`;
  if (!src.includes(effectAnchor)) throw new Error("theme-provider: effect anchor not found");
  src = src.replace(effectAnchor, effectAnchor + BRIDGE);

  write(p, src);
  log("theme-provider", "bridged to UnistylesRuntime");
}

/* ------------------------------------------------------------------------ */
try {
  addDeps();
  patchBabel();
  writeUnistyles();
  patchIndex();
  writeTypes();
  patchThemeProvider();
  log("done");
} catch (error) {
  console.error(`[setup] FAILED: ${error.message}`);
  process.exit(1);
}
