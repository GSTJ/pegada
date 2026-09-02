import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

/**
 * The defect: this file listed only the EAS upload key. Play App Signing is
 * on, so Play strips that signature off every upload and re-signs with its
 * own app signing key before sending the build to a device. The certificate
 * Android compares against on a store install is therefore never the one we
 * were publishing, verification failed for every Play user, and pegada.app
 * links opened in Chrome instead of the app. Nothing surfaces that: there is
 * no error, no crash, just a browser where the app should have been.
 *
 * Both keys stay listed. Upload-key signatures still reach devices through
 * internal testing tracks and sideloads, so dropping either one breaks a real
 * install path.
 *
 * The route handler is executed rather than read as text, so what is asserted
 * is the bytes Android would fetch. It imports through the `@/` alias, which
 * only the bundler understands, hence the resolve hook.
 */

const SRC = pathToFileURL(
  path.join(import.meta.dirname, "..", "src") + path.sep,
);

registerHooks({
  resolve(specifier, context, next) {
    if (!specifier.startsWith("@/")) return next(specifier, context);
    return next(new URL(`${specifier.slice(2)}.ts`, SRC).href, context);
  },
});

const { GET: serveAssetLinks } =
  await import("../src/app/.well-known/assetlinks.json/route.ts");

const served = await serveAssetLinks().json();

/** Play Console -> Setup -> App integrity -> App signing key certificate. */
const PLAY_APP_SIGNING_KEY =
  "BB:15:EB:D3:9D:EB:29:94:C5:B4:11:D4:C9:1D:65:19:9C:81:60:28:E8:BE:6B:29:96:32:7B:2B:18:43:29:C3";

/** `eas credentials` -> Android -> app.pegada -> Keystore. */
const UPLOAD_KEY =
  "36:51:99:FC:45:EF:55:03:38:23:04:05:C5:B6:C9:F1:C9:39:69:10:9D:64:8D:4D:DC:C3:01:E4:70:E1:9A:8B";

const [statement, ...extraStatements] = served;

test("grants app.pegada permission to handle every pegada.app URL", () => {
  assert.equal(extraStatements.length, 0);
  assert.deepEqual(statement.relation, [
    "delegate_permission/common.handle_all_urls",
  ]);
  assert.equal(statement.target.namespace, "android_app");
  assert.equal(statement.target.package_name, "app.pegada");
});

test("serves both the upload key and the Play app signing key", () => {
  assert.deepEqual(statement.target.sha256_cert_fingerprints, [
    UPLOAD_KEY,
    PLAY_APP_SIGNING_KEY,
  ]);
});

test("every fingerprint is a SHA-256 digest, not a SHA-1 one", () => {
  // Play Console shows MD5, SHA-1 and SHA-256 for the same certificate, one
  // under the other. Copying the wrong row costs a release to notice, because
  // Android rejects the statement without saying which field was wrong.
  for (const fingerprint of statement.target.sha256_cert_fingerprints) {
    assert.match(fingerprint, /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  }
});
