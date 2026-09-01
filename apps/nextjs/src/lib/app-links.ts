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
 * not in this repo, and can't be guessed — a wrong value silently fails
 * verification instead of erroring, so a placeholder that obviously needs
 * replacing beats a plausible-looking one. `eas credentials` → Android →
 * select the `app.pegada` app → "Keystore" → prints "SHA256 Fingerprint"
 * for the release-signing keystore.
 */
export const APPLE_TEAM_ID = "23DRM684H8";

// Will hold both the Play app-signing certificate and the EAS upload key
// fingerprints once they're pulled from EAS credentials.
export const ANDROID_SHA256_CERT_FINGERPRINTS = ["REPLACE_WITH_ANDROID_SHA256"];

export const APP_BUNDLE_ID = "app.pegada";

export const APPLE_APP_ID = `${APPLE_TEAM_ID}.${APP_BUNDLE_ID}`;
