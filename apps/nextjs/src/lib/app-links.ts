/**
 * Values Apple's App Site Association and Android's Digital Asset Links need
 * to prove `app.pegada` owns `www.pegada.app`.
 *
 * The Apple Team ID is not a secret: the AASA file that embeds it is served
 * unauthenticated to anyone who asks, by definition, so committing it here
 * is fine even though the build keeps it out of app.config.ts (it was
 * removed from `appleTeamId` there in favor of an EAS build secret).
 *
 * Android SHA256 fingerprint(s) are different: they live in EAS credentials,
 * not in this repo. The entry below is the EAS upload key (`eas credentials`
 * -> Android -> select the `app.pegada` app -> "Keystore" -> "SHA256
 * Fingerprint"). If Google Play App Signing is on for this app, Play
 * re-signs the uploaded bundle with its own app signing key before
 * distributing it, and that key's fingerprint (Play Console -> Setup -> App
 * integrity -> App signing key certificate) must be appended here too, or
 * devices that installed from Play will fail verification.
 */
export const APPLE_TEAM_ID = "23DRM684H8";

export const ANDROID_SHA256_CERT_FINGERPRINTS = [
  "36:51:99:FC:45:EF:55:03:38:23:04:05:C5:B6:C9:F1:C9:39:69:10:9D:64:8D:4D:DC:C3:01:E4:70:E1:9A:8B",
];

export const APP_BUNDLE_ID = "app.pegada";

export const APPLE_APP_ID = `${APPLE_TEAM_ID}.${APP_BUNDLE_ID}`;
