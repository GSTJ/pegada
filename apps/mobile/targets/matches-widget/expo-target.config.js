/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  name: "PegadaMatchesWidget",
  displayName: "Pegada",
  // `.` prefix appends to the main app's bundle id -> app.pegada.matcheswidget
  bundleIdentifier: ".matcheswidget",
  // containerBackground(for: .widget) requires iOS 17. The main app supports
  // lower versions; users below 17 simply won't see the widget in the gallery.
  deploymentTarget: "17.0",
  frameworks: ["SwiftUI", "WidgetKit"],
  colors: {
    $accent: "#EE61A1",
    $widgetBackground: { color: "#FFFFFF", darkColor: "#16151A" },
    BrandPink: "#EE61A1",
    PrimaryText: { color: "#1C1B1F", darkColor: "#F3F1F6" },
  },
  // App Groups are mirrored automatically from ios.entitlements in
  // app.config.ts, declared here too so the target works standalone.
  entitlements: {
    "com.apple.security.application-groups": ["group.app.pegada"],
  },
};
