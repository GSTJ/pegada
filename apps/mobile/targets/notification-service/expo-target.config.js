// Notification Service Extension (NSE) for chat pushes. Intercepts pushes
// sent with `mutable-content: 1` (see packages/api MessageService) and
// restyles them as iOS communication notifications: sender dog avatar +
// name, iMessage-style. See NotificationService.swift for the actual work.
//
// Wired into the Xcode project at prebuild time by @bacons/apple-targets
// (the `targets/` folder is CNG-safe: nothing under ios/ is committed).

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: "notification-service",
  name: "PegadaNotificationService",
  displayName: "Pegada Notification Service",
  // Appended to the main app's bundle id -> app.pegada.notificationservice
  bundleIdentifier: ".notificationservice",
  // INSendMessageIntent + UNNotificationContent.updating(from:) need iOS 15+.
  deploymentTarget: "15.1",
  frameworks: ["UserNotifications", "Intents"],
  entitlements: {
    // Communication-notification styling. Must also be enabled on the App ID
    // in the Apple Developer portal for device builds (simulator doesn't
    // enforce it). The main app carries the same entitlement via
    // `ios.entitlements` in app.config.ts.
    "com.apple.developer.usernotifications.communication": true,
  },
};
