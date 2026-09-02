/**
 * Values Apple's App Site Association and Android's Digital Asset Links need
 * to prove `app.pegada` owns `www.pegada.app`.
 *
 * The Apple Team ID is not a secret: the AASA file that embeds it is served
 * unauthenticated to anyone who asks, by definition, so committing it here
 * is fine even though the build keeps it out of app.config.ts (it was
 * removed from `appleTeamId` there in favor of an EAS build secret).
 *
 * Android SHA256 fingerprint(s) are different: they live in EAS credentials
 * and in the Play Console, not in this repo. Play App Signing is on for this
 * app, so two distinct keys touch a release and both have to be listed:
 * Android compares the certificate of the installed APK, and which key that
 * is depends on how the build reached the device.
 */
export const APPLE_TEAM_ID = "23DRM684H8";

export const ANDROID_SHA256_CERT_FINGERPRINTS = [
  // Upload key. Signs the bundle we hand to Play, and the one Play strips off
  // before distributing. Read from `eas credentials` -> Android -> the
  // `app.pegada` app -> "Keystore" -> "SHA256 Fingerprint". Kept because
  // internal-testing and sideloaded builds reach devices signed with it.
  "36:51:99:FC:45:EF:55:03:38:23:04:05:C5:B6:C9:F1:C9:39:69:10:9D:64:8D:4D:DC:C3:01:E4:70:E1:9A:8B",
  // Play app signing key. Play re-signs every build with this one before
  // sending it to a device, so it is the certificate on every store install.
  // Read from Play Console -> Setup -> App integrity -> App signing key
  // certificate -> "SHA-256 certificate fingerprint".
  "BB:15:EB:D3:9D:EB:29:94:C5:B4:11:D4:C9:1D:65:19:9C:81:60:28:E8:BE:6B:29:96:32:7B:2B:18:43:29:C3",
];

export const APP_BUNDLE_ID = "app.pegada";

export const APPLE_APP_ID = `${APPLE_TEAM_ID}.${APP_BUNDLE_ID}`;
