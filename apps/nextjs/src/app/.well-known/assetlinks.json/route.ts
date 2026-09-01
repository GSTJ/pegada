import {
  ANDROID_SHA256_CERT_FINGERPRINTS,
  APP_BUNDLE_ID,
} from "@/lib/app-links";

// Static: Android fetches this file unauthenticated, over plain HTTPS, with
// no locale or user context, so there is nothing here that ever needs to
// vary per request.
export const dynamic = "force-static";

/**
 * Android resolves this file to decide whether `app.pegada` is allowed to
 * open `www.pegada.app` links directly instead of in the browser. The
 * `delegate_permission/common.handle_all_urls` relation is Google's fixed
 * string for that grant; `sha256_cert_fingerprints` must match the
 * certificate the Play Store release build is signed with, not a debug
 * keystore, or verification silently fails.
 */
const body = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: APP_BUNDLE_ID,
      sha256_cert_fingerprints: [...ANDROID_SHA256_CERT_FINGERPRINTS],
    },
  },
];

export const GET = () =>
  Response.json(body, {
    headers: {
      "Content-Type": "application/json",
      // Rarely changes, but `ANDROID_SHA256_CERT_FINGERPRINTS` is still a
      // placeholder here, so `immutable` would be a lie — a long max-age is
      // enough.
      "Cache-Control": "public, max-age=86400",
    },
  });
