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
  // COLOR SPACE WARNING: @bacons/apple-targets (see
  // node_modules/@bacons/apple-targets/build/colorset/with-ios-colorset.js,
  // `createColor`) always tags the emitted Contents.json as
  // "color-space": "display-p3", but it gets there by parsing the CSS string
  // below as plain sRGB (via @react-native/normalize-colors) and writing
  // those 0-1 components verbatim - it never actually converts anything to
  // P3. Rendered on a wide-gamut display, a P3-tagged sRGB color reads MORE
  // saturated than intended (confirmed: BrandPink measured ~#FF55A3 instead
  // of the intended #EE61A1). The plugin has no color-space option, and
  // prebuild rewrites every colorset's Contents.json unconditionally on
  // every run, so a hand-fixed Contents.json would just get clobbered on
  // the next prebuild.
  //
  // Fix: instead of feeding the plugin these colors' literal sRGB hex, feed
  // it the sRGB->Display-P3 gamut-mapped equivalent (as an rgb() string, so
  // normalize-colors parses it as literal 0-255 components instead of
  // reinterpreting hex through its own sRGB math). The plugin then writes
  // those P3-mapped numbers into a "display-p3" colorset, and a P3 display
  // renders them back to the ORIGINAL sRGB appearance. Values below were
  // computed with scripts/srgb-to-p3-widget-colors.js's conversion function
  // (sRGB -> linear sRGB -> CIE XYZ (D65) -> linear Display P3 ->
  // gamma-encoded Display P3, IEC 61966-2-1 / SMPTE RP 431-2 matrices) run
  // against this file's own hex colors - re-run it against these hex values
  // and paste the output here if these colors ever change; do NOT hand-edit
  // the rgb() values without it.
  colors: {
    $accent: "rgb(221, 106, 159)", // #EE61A1 -> P3-mapped
    $widgetBackground: { color: "rgb(255, 255, 255)", darkColor: "rgb(22, 21, 26)" }, // #FFFFFF / #16151A -> P3-mapped
    BrandPink: "rgb(221, 106, 159)", // #EE61A1 -> P3-mapped
    PrimaryText: { color: "rgb(28, 27, 31)", darkColor: "rgb(243, 241, 246)" }, // #1C1B1F / #F3F1F6 -> P3-mapped
  },
  // App Groups shared with the main app; harmless for entries that don't
  // read the shared container.
  entitlements: {
    "com.apple.security.application-groups": ["group.app.pegada"],
  },
};
