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
  colors: {
    $accent: "#EE61A1",
    $widgetBackground: { color: "#FFFFFF", darkColor: "#16151A" },
    BrandPink: "#EE61A1",
    PrimaryText: { color: "#1C1B1F", darkColor: "#F3F1F6" },
  },
  // App Groups shared with the main app; harmless for entries that don't
  // read the shared container.
  entitlements: {
    "com.apple.security.application-groups": ["group.app.pegada"],
  },
};
