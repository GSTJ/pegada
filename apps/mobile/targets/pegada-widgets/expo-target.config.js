/** @type {import('@bacons/apple-targets/app.plugin').Config} */
// The ONE shared WidgetKit extension target for every widget-family feature
// (home-screen widgets, ActivityKit Live Activities, iOS 18 Control Center
// controls). iOS allows a single widget extension per app, so new features
// register themselves in PegadaWidgetsBundle.swift instead of adding another
// target. Keep this file byte-identical across feature branches so merges
// resolve cleanly.
//
// deploymentTarget 16.2 is the floor for the ActivityKit content APIs the
// Live Activity uses; newer-OS features (iOS 17 widget APIs, iOS 18
// controls) gate themselves with @available / #available in their own Swift
// files. Team ID comes from EAS credentials at release build time; local
// simulator builds don't sign.
module.exports = {
  type: "widget",
  name: "PegadaWidgets",
  displayName: "Pegada",
  // `.` prefix appends to the main app's bundle id -> app.pegada.widgets
  bundleIdentifier: ".widgets",
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit", "AppIntents"],
  // Design tokens mirrored 1:1 from packages/shared/themes/themes.ts (light /
  // dark). Values are the exact HSL strings from the theme so the widget and
  // the app read as one family; prebuild converts them to colorsets. NOTE:
  // the plugin expects `{ light, dark }` (not `{ color, darkColor }`) -
  // anything else silently writes an EMPTY colorset.
  colors: {
    $accent: "hsl(333, 81%, 66%)", // colors.primary (light)
    $widgetBackground: { light: "hsl(0, 0%, 100%)", dark: "hsl(0, 0%, 0%)" }, // colors.background
    BrandPink: { light: "hsl(333, 81%, 66%)", dark: "hsl(333, 58%, 59%)" }, // colors.primary
    PrimaryText: { light: "hsl(222.2, 84%, 4.9%)", dark: "hsl(0, 0%, 95%)" }, // colors.text
    SubtitleText: { light: "hsl(222.2, 10%, 39%)", dark: "hsl(0, 0%, 60%)" }, // colors.subtitle
    CardSurface: { light: "hsl(0, 0%, 97.5%)", dark: "hsl(0, 0%, 15%)" }, // colors.card
    BorderSubtle: { light: "hsl(214.3, 31.8%, 91.4%)", dark: "hsl(0, 0%, 12%)" }, // colors.border
  },
  // App Groups shared with the main app; harmless for entries that don't
  // read the shared container.
  entitlements: {
    "com.apple.security.application-groups": ["group.app.pegada"],
  },
};
