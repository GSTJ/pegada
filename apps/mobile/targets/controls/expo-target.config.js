/** @type {import('@bacons/apple-targets/app.plugin').Config} */
// iOS 18+ Control Center widget target ("PegadaControls"). Compiled as a
// WidgetKit extension by @bacons/apple-targets during `expo prebuild` --
// nothing here is committed inside a generated ios/ directory.
//
// deploymentTarget is intentionally 18.0: Control Center controls only exist
// on iOS 18+, and an extension with a higher minimum OS than the host app is
// simply ignored by older iOS versions (the app itself still installs and
// runs fine). That's the availability gate.
module.exports = {
  type: "widget",
  name: "PegadaControls",
  deploymentTarget: "18.0",
  frameworks: ["SwiftUI", "WidgetKit", "AppIntents"],
};
