#!/usr/bin/env node
// The last stage that writes to apps/mobile: takes styled-components out now
// that Unistyles owns every style in the app.
//
// It runs after the patches rather than before them because most of what it
// edits does not exist until they have run — `MainCard/styles.tsx` is a rename
// `12-main-card` performs, `FeedbackCard/styles.tsx` one `33-feedback-card`
// performs. Everything here is an anchored replacement that throws when its
// anchor is missing, so a patch that changes one of these files upstream fails
// this stage loudly instead of silently leaving styled-components behind.
//
// Idempotent like `setup.mjs`: every step checks for its own output first, so
// running it twice is a no-op.
//
// One thing it also does is scrub the *prose*. Comments across the app named
// styled-components while explaining why a converted module is shaped the way
// it is, and `grep styled-components apps/mobile` returning zero is the
// invariant this stage asserts at the end. The package name is not lost: it is
// all over this directory and all over git history, one level up from the app.
//
// It also carries the migration's other standing gate, on sticky headers — the
// one place React Native takes a style off the element it was written on. See
// section 9.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const mobile = path.join(repoRoot, "apps", "mobile");

const log = (step, detail) => console.log(`[cleanup] ${step}${detail ? ` — ${detail}` : ""}`);

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);

/**
 * Applies `[find, replace]` pairs to one file, asserting that each `find`
 * occurs exactly once. A step whose replacements are all already present is
 * reported as a no-op rather than a failure, which is what makes reruns safe.
 */
function edit(relative, replacements) {
  const file = path.join(mobile, relative);
  const before = read(file);
  let source = before;

  for (const [find, replace] of replacements) {
    if (!source.includes(find)) {
      if (source.includes(replace)) continue;
      throw new Error(`${relative}: anchor not found\n---\n${find}\n---`);
    }
    if (source.split(find).length > 2) {
      throw new Error(`${relative}: anchor is not unique\n---\n${find}\n---`);
    }
    source = source.replace(find, replace);
  }

  if (source === before) return false;
  write(file, source);
  return true;
}

const step = (name, relative, replacements) => {
  log(name, edit(relative, replacements) ? relative : "already clean");
};

/* 1. dependencies -------------------------------------------------------- */
// styled-components itself, its babel plugin, and the tsserver plugin that
// linted the template literals. Nothing else in the workspace imports any of
// them; the only remaining consumer anywhere is the parity ledger, which now
// depends on styled-components from `.unistyles-codemod/package.json` so it can
// keep replaying the pre-migration pipeline for ground truth.
// The section each one lives in is deliberately not assumed:
// `@styled/typescript-styled-plugin` is a tsserver plugin that was filed under
// `dependencies`, and a version of this that only looked in `devDependencies`
// left it behind without saying so.
const DEAD_DEPENDENCIES = [
  "@styled/typescript-styled-plugin",
  "babel-plugin-styled-components",
  "styled-components",
];

function dropDeps() {
  const pkgPath = path.join(mobile, "package.json");
  const pkg = JSON.parse(read(pkgPath));
  const sections = ["dependencies", "devDependencies", "peerDependencies"];
  const dropped = [];

  for (const name of DEAD_DEPENDENCIES) {
    for (const section of sections) {
      if (!pkg[section] || !(name in pkg[section])) continue;
      delete pkg[section][name];
      dropped.push(name);
    }
  }

  if (dropped.length === 0) return log("deps", "already dropped");

  write(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  log("deps", dropped.join(", "));
}

/* 2. babel --------------------------------------------------------------- */
// The unistyles plugin stays first and reanimated's stays last; the one in the
// middle is the one that goes.
const dropBabelPlugin = () =>
  step("babel", "babel.config.js", [
    [
      `      ["react-native-unistyles/plugin", { root: "src" }],\n      "babel-plugin-styled-components",\n`,
      `      ["react-native-unistyles/plugin", { root: "src" }],\n`,
    ],
  ]);

/* 3. metro --------------------------------------------------------------- */
// The shim existed because a transitive import of bare "styled-components"
// resolved to the WEB build and dragged the DOM StyleSheet into the iOS bundle
// (CI run 28596688266). With the package gone from the app there is no bare
// specifier left to redirect, so the resolver hook goes with it rather than
// sitting there as a rule about a dependency that no longer exists.
const METRO_SHIM = `
// 4. Never let native bundles resolve the WEB build of styled-components.
// A transitive import of bare "styled-components" pulls the DOM StyleSheet
// (document.head/createElement) into the iOS bundle; depending on install
// layout it can end up EXECUTED and the app dies at route load with
// "ReferenceError: Property 'document' doesn't exist" (seen on CI run
// 28596688266 while local builds happened to resolve the native build).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform !== "web" && moduleName === "styled-components") {
    moduleName = "styled-components/native";
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};
`;

const dropMetroShim = () => step("metro", "metro.config.js", [[METRO_SHIM, ""]]);

/* 4. tsconfig ------------------------------------------------------------ */
// The plugin only ever taught tsserver about React Native's CSS properties
// inside styled-components template literals. There are no template literals
// left, and the whole `plugins` array had nothing else in it.
const TSCONFIG_PLUGIN = `,
    "plugins": [
      {
        "name": "@styled/typescript-styled-plugin",
        "lint": {
          "validProperties": [
            "shadow-color",
            "shadow-opacity",
            "shadow-offset",
            "shadow-radius",
            "padding-horizontal",
            "padding-vertical",
            "margin-vertical",
            "margin-horizontal",
            "tint-color",
            "aspect-ratio",
            "elevation"
          ]
        }
      }
    ]`;

const dropTsconfigPlugin = () => step("tsconfig", "tsconfig.json", [[TSCONFIG_PLUGIN, ""]]);

/* 5. type augmentation --------------------------------------------------- */
// `src/types/unistyles.d.ts` already augments UnistylesThemes with the same
// app themes, so nothing is lost by deleting this.
function dropTypes() {
  const file = path.join(mobile, "src", "types", "styled-components.d.ts");
  if (!fs.existsSync(file)) return log("types", "already deleted");
  fs.rmSync(file);
  log("types", "src/types/styled-components.d.ts deleted");
}

/* 6. ThemeProvider ------------------------------------------------------- */
// `setup.mjs` bridged the two styling systems: styled-components'
// ThemeProvider carried the theme down through React context, and a passive
// effect mirrored it into UnistylesRuntime afterwards. With the bridge's other
// half gone, that effect IS the theme switch, and a passive effect is the
// wrong hook for it — see the comment it writes into the file.
const THEME_PROVIDER = [
  [
    `import { useContext, useEffect, useMemo, useState } from "react";`,
    `import { useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";`,
  ],
  [
    `import { DarkTheme, LightTheme } from "@pegada/shared/themes/themes";\n`,
    ``,
  ],
  [
    `import { UnistylesRuntime } from "react-native-unistyles";\nimport { ThemeProvider as StyledThemeProvider } from "styled-components/native";`,
    `import { UnistylesRuntime, useUnistyles } from "react-native-unistyles";`,
  ],
  [
    `export const themes = {
  [Theme.Light]: LightTheme,
  [Theme.Dark]: DarkTheme,
};

`,
    ``,
  ],
  [
    `  const colorScheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(null);
`,
    `  const colorScheme = useColorScheme();
  const [activeTheme, setActiveTheme] = useState<ActiveTheme>(null);

  // Read back from the registry this provider writes to below, so the
  // Navigation theme and the stylesheets can never disagree about which theme
  // is active. \`colors\` and \`dark\` are read off the proxy rather than kept as
  // \`theme\`: the proxy is rebuilt on every render, so depending on it would
  // re-run every effect and memo below on every render, while the values
  // behind it keep their identity until the theme actually changes.
  const { colors, dark } = useUnistyles().theme;
`,
  ],
  [
    `  const theme =
    themes[(activeTheme as Theme) ?? (colorScheme as Theme) ?? Theme.Default] ??
    themes[Theme.Default];`,
    `  //
  // Only the NAME is derived here. The theme object itself comes from
  // Unistyles, which is the single registry now — anything unregistered falls
  // back to the default exactly as the old \`?? themes[Theme.Default]\` did.
  const requested = activeTheme ?? colorScheme ?? Theme.Default;
  const themeName = requested === Theme.Dark ? "dark" : "light";`,
  ],
  [
    `  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch(sendError);
  }, [theme]);`,
    `  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(sendError);
  }, [colors.background]);`,
  ],
  [
    `  // Unistyles keeps its own theme registry, outside React. This provider stays
  // the source of truth (it owns the stored override), so every resolved theme
  // is mirrored into the runtime — otherwise \`StyleSheet.create\` styles would
  // keep following the system scheme while styled-components followed the user.
  useEffect(() => {
    UnistylesRuntime.setTheme(theme.dark ? "dark" : "light");
  }, [theme]);`,
    `  // Unistyles keeps its theme registry outside React, so switching themes
  // means writing to it. This provider owns the stored override, which makes
  // it the only writer — and now that nothing else styles the tree, this call
  // IS the theme switch rather than a mirror of one.
  //
  // A LAYOUT effect, not a passive one. \`setTheme\` does not repaint anything
  // itself: the native side queues the rebuild onto the JS thread
  // (\`callInvoker->invokeAsync\`) and only then updates the shadow tree and
  // wakes the \`useUnistyles\` subscribers. Every scheduler turn between the
  // decision and that queue is a turn the tree spends in the previous theme,
  // and layout effects run inside the commit while passive effects run a turn
  // later. That turn is the boot blink the stored-theme handling above exists
  // to prevent, and it would now show on the settings toggle too.
  //
  // Not during render, which would be earlier still: a concurrent render that
  // React throws away would have switched the app's theme anyway.
  //
  // Not at the two call sites that change the theme either, tempting as it is
  // to write it where the decision is made: the system scheme can change with
  // no stored override involved, and \`colorScheme\` is the only thing that
  // sees that.
  useLayoutEffect(() => {
    if (UnistylesRuntime.themeName === themeName) return;
    UnistylesRuntime.setTheme(themeName);
  }, [themeName]);`,
  ],
  [
    `  // React Navigation paints every screen container with ITS theme, not the
  // styled-components one. Without this provider the Stack uses the default
  // light background regardless of the app theme, flashing white behind
  // transitions and behind screens without an explicit background.
  const navigationTheme = useMemo(() => {
    const base = theme.dark ? NavigationDarkTheme : NavigationLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.card,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);`,
    `  // React Navigation paints every screen container with ITS theme, not the
  // app's. Without this provider the Stack uses the default light background
  // regardless of the app theme, flashing white behind transitions and behind
  // screens without an explicit background.
  const navigationTheme = useMemo(() => {
    const base = dark ? NavigationDarkTheme : NavigationLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, dark]);`,
  ],
  [
    `      <NavigationThemeProvider value={navigationTheme}>
        <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
      </NavigationThemeProvider>`,
    `      <NavigationThemeProvider value={navigationTheme}>
        {children}
      </NavigationThemeProvider>`,
  ],
];

const rewriteThemeProvider = () =>
  step("theme-provider", "src/contexts/theme-provider.tsx", THEME_PROVIDER);

/* 7. the absoluteFill fragment ------------------------------------------- */
// The one `css` fragment the migration kept: five declarations shared by every
// full-bleed layer in the card stack. A plain object does the same job, and
// `FeedbackCard` spreads it the way its pre-migration source interpolated it.
const ABSOLUTE_FILL_DECLARATIONS = `    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    left: 0,
`;

const MAIN_CARD = [
  [
    `import { StyleSheet, withUnistyles } from "react-native-unistyles";\nimport { css } from "styled-components/native";`,
    `import { StyleSheet, withUnistyles } from "react-native-unistyles";`,
  ],
  [
    `/**
 * Nothing renders this any more — \`FeedbackCard\` converted and inlines the same
 * five declarations, as everything in this module already did. It survives for
 * the parity ledger: the pristine \`FeedbackCard/styles.ts\` interpolates it, and
 * the ledger loads that module from git while resolving its imports against the
 * working tree, so deleting this drops five declarations from ground truth and
 * fails the \`AbsolutePosition\` check. It goes when styled-components does.
 */
export const absoluteFill = css\`
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
\`;`,
    `/**
 * The five declarations every full-bleed layer in the card stack repeats.
 * Exported because \`FeedbackCard\` spreads it too, which is how its
 * pre-migration source consumed it.
 */
export const absoluteFill = {
  position: "absolute",
  top: 0,
  bottom: 0,
  right: 0,
  left: 0,
} as const;`,
  ],
  [
    `  picture: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
${ABSOLUTE_FILL_DECLARATIONS}  },`,
    `  picture: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    ...absoluteFill,
  },`,
  ],
  [
    `  carouselContainer: {
    flexDirection: "row",
${ABSOLUTE_FILL_DECLARATIONS}  },`,
    `  carouselContainer: {
    flexDirection: "row",
    ...absoluteFill,
  },`,
  ],
  [
    `  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },`,
    `  scrim: {
    ...absoluteFill,
  },`,
  ],
];

const FEEDBACK_CARD = [
  [
    `import MainCard from "../MainCard";`,
    `import MainCard from "../MainCard";\nimport { absoluteFill } from "../MainCard/styles";`,
  ],
  [
    `  absolutePosition: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
${ABSOLUTE_FILL_DECLARATIONS}  },`,
    `  absolutePosition: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    ...absoluteFill,
  },`,
  ],
];

const rewriteAbsoluteFill = () => {
  step("main-card", "src/components/MainCard/styles.tsx", MAIN_CARD);
  step("feedback-card", "src/components/FeedbackCard/styles.tsx", FEEDBACK_CARD);
};

/* 8. prose --------------------------------------------------------------- */
// Comments that named the package while explaining a converted module. Each
// keeps the fact it was carrying — which mechanism produced the behaviour the
// module has to reproduce — and drops the name, so the invariant asserted at
// the bottom of this file holds.
const PROSE = [
  [
    "oxlint.config.mts",
    `    // \`styles.ts\` next to a component is this repo's styled-components
    // convention — \`S.Container\` is how you tell a styled node from a real one.`,
    `    // a \`styles.ts\` module next to a component is this repo's convention —
    // \`S.Container\` is how you tell a styled node from a real one.`,
  ],
  [
    ".maestro/checks/01-launch.sh",
    `# class this gate has eaten (entitlements, env, styled-components DOM
# branch, Ads SDK abort).`,
    `# class this gate has eaten (entitlements, env, a DOM-only branch of a
# styling library reaching the native bundle, Ads SDK abort).`,
  ],
  [
    "src/components/text.tsx",
    ` * modules build on it — \`styled(Text)\` on the styled-components side, a plain`,
    ` * modules build on it — \`styled(Text)\` on the pre-migration side, a plain`,
  ],
  [
    "src/components/Button/index.tsx",
    ` * styled-components handed it to \`PressableArea\` inside an array, where the
 * function was never called.`,
    ` * the pre-migration wrapper handed it to \`PressableArea\` inside an array,
 * where the function was never called.`,
  ],
  [
    "src/components/NetworkBoundary/styles.tsx",
    ` * styled-components let the extra attr through and the view dropped it. It is
 * gone rather than carried over as a lie.`,
    ` * the pre-migration \`.attrs\` let it through and the view dropped it. It is
 * gone rather than carried over as a lie.`,
  ],
  [
    "src/components/MatchActionBar/styles.tsx",
    ` * they sit after the spread, exactly where styled-components put them.`,
    ` * they sit after the spread, exactly where \`.attrs\` used to put them.`,
  ],
  [
    "src/views/Chat/components/Message/styles.ts",
    `   * Unistyles agrees with styled-components: the base first, the buckets on
   * top.`,
    `   * Unistyles agrees with the cascade it replaced: the base first, the
   * buckets on top.`,
  ],
  [
    "src/views/DogProfile/components/GoBack/styles.tsx",
    ` * the caller, exactly as styled-components had it.`,
    ` * the caller, exactly as \`.attrs\` used to have it.`,
  ],
  [
    "src/views/(tabs)/Profile/components/UserDogProfileHeader/styles.tsx",
    ` * \`UnknownErrorComponent\` hands its props to a styled-components ScrollView,
 * which the babel plugin never sees, so the sheet has to arrive resolved.`,
    ` * \`UnknownErrorComponent\` hands its props to a ScrollView the babel plugin
 * never sees, so the sheet has to arrive resolved.`,
  ],
  [
    "src/views/NewMatch/styles.tsx",
    ` * So the sheet travels down \`style\`, first in the array, exactly as
 * styled-components delivered it.`,
    ` * So the sheet travels down \`style\`, first in the array, exactly as the
 * pre-migration wrapper delivered it.`,
  ],
];

function rewriteProse() {
  const touched = PROSE.filter(([file, find, replace]) => edit(file, [[find, replace]]));
  log("prose", touched.length === 0 ? "already clean" : `${touched.length} comment(s) rewritten`);
}

/* 9. sticky headers ------------------------------------------------------ */
// The one React Native API in this app that moves a style off the element it
// was written on. `ScrollView` does not render a `stickyHeaderIndices` child
// directly: it wraps the child in an `Animated.View` of its own, hoists the
// child's `style` onto that wrapper and hands the child `{ flex: 1 }` in its
// place (ScrollViewStickyHeader). Before the migration that was harmless — the
// child computed its own style below the wrapper — but a Unistyles sheet
// passed there lands on a node the runtime was never handed, so it holds the
// theme the screen booted with for the life of the screen. Profile's header
// rendered white "Settings" on a white band in dark mode for two rounds
// because of it.
//
// `Profile/index.tsx` is written around it: the sticky child is a bare view
// and the sheet sits one level down. This gate exists because no screenshot
// pass can catch a repeat — the bug only appears when the theme changes on a
// mounted tree, and every parity screen boots into its theme instead. So a
// sticky header the migration has not been through stops the run.
const REVIEWED_STICKY_HEADERS = ["src/views/(tabs)/Profile/index.tsx"];

function assertStickyHeadersReviewed() {
  const found = [];

  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && read(full).includes("stickyHeaderIndices")) {
        found.push(path.relative(mobile, full));
      }
    }
  };

  walk(path.join(mobile, "src"));

  const unreviewed = found.filter((file) => !REVIEWED_STICKY_HEADERS.includes(file));
  const stale = REVIEWED_STICKY_HEADERS.filter((file) => !found.includes(file));

  if (unreviewed.length > 0) {
    throw new Error(
      `sticky header not reviewed for live theme switching:\n  ${unreviewed.join("\n  ")}\n` +
        `  Keep the sheet off the sticky child itself — ScrollView hoists that style\n` +
        `  onto a wrapper Unistyles cannot update — then add the file above.`,
    );
  }

  if (stale.length > 0) {
    throw new Error(`no sticky header left in:\n  ${stale.join("\n  ")}\n  Drop it from the list.`);
  }

  log("sticky headers", `${found.length} reviewed`);
}

/* 10. the invariant ------------------------------------------------------ */
// The point of the whole stage, asserted rather than assumed. Any future patch
// that reintroduces the name — in a dependency, a config, an import or a
// comment — fails the run here instead of at review time.
const SKIP = new Set(["node_modules", "ios", "android", ".expo", ".turbo", "Pods"]);
const BINARY = /\.(png|jpe?g|webp|gif|lottie|ttf|otf|ico|icns|zip|keystore|jks|mp4|mov)$/i;
// `@styled/typescript-styled-plugin` does not contain the string
// "styled-components", so grepping for the library name alone would have
// declared victory with the tsserver plugin still installed. It did, once.
const BANNED = ["styled-components", "@styled/"];

function assertGone() {
  const offenders = [];

  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (BINARY.test(entry.name)) continue;
      const source = read(full);
      const hit = BANNED.find((banned) => source.includes(banned));
      if (hit) offenders.push(`${path.relative(repoRoot, full)} (${hit})`);
    }
  };

  walk(mobile);

  if (offenders.length > 0) {
    throw new Error(`styled-components still present in:\n  ${offenders.join("\n  ")}`);
  }

  log("verified", `no ${BANNED.join(" / ")} references under apps/mobile`);
}

/* ------------------------------------------------------------------------ */
try {
  dropDeps();
  dropBabelPlugin();
  dropMetroShim();
  dropTsconfigPlugin();
  dropTypes();
  rewriteThemeProvider();
  rewriteAbsoluteFill();
  rewriteProse();
  assertStickyHeadersReviewed();
  assertGone();
  log("done");
} catch (error) {
  console.error(`[cleanup] FAILED: ${error.message}`);
  process.exit(1);
}
