/**
 * Values Apple's App Site Association and Android's Digital Asset Links need
 * to prove `app.pegada` owns `www.pegada.app`. Both live in EAS credentials,
 * not in this repo, and neither can be guessed — a wrong value silently
 * fails verification instead of erroring, so a placeholder that obviously
 * needs replacing beats a plausible-looking one.
 *
 * Apple Team ID: `eas credentials` → iOS → select the `app.pegada` app →
 * the build credentials screen prints "Team ID" next to the Apple Team name.
 * (Also visible on developer.apple.com under Membership.)
 *
 * Android SHA256 fingerprint: `eas credentials` → Android → select the
 * `app.pegada` app → "Keystore" → prints "SHA256 Fingerprint" for the
 * release-signing keystore.
 */
export const APPLE_TEAM_ID = "REPLACE_WITH_APPLE_TEAM_ID";

export const ANDROID_SHA256_CERT_FINGERPRINT = "REPLACE_WITH_ANDROID_SHA256";

export const APP_BUNDLE_ID = "app.pegada";

export const APPLE_APP_ID = `${APPLE_TEAM_ID}.${APP_BUNDLE_ID}`;
