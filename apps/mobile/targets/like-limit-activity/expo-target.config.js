/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "widget",
  name: "LikeLimitActivity",
  displayName: "Pegada",
  // Text(timerInterval:) / ProgressView(timerInterval:) need 16.0,
  // ActivityKit content APIs we use need 16.2.
  deploymentTarget: "16.2",
  frameworks: ["SwiftUI", "WidgetKit", "ActivityKit"],
};
