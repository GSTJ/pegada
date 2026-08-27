// @ts-nocheck
/**
 * The decision and the edit behind `with-cleartext-traffic.js`, kept separate
 * from the plugin wrapper so they can be tested: requiring
 * `@expo/config-plugins` pulls in `expo/virtual/env.js`, which is ESM that
 * this project's jest does not transform, so anything that imports the plugin
 * cannot be loaded in a test at all.
 */

const isCleartextApi = (url) => Boolean(url) && url.startsWith("http://");

/**
 * Whether this build needs `android:usesCleartextTraffic`.
 *
 * The gate is the API URL rather than a flag, because the URL is already the
 * thing that decides: https makes the permission a no-op, http makes the
 * build unable to reach its own API. `production` is a hard veto rather than
 * part of the condition — a production build pointed at http is a mistake to
 * surface, not one to paper over by downgrading the transport.
 */
const shouldAllowCleartext = ({ apiUrl, appEnv }) =>
  appEnv !== "production" && isCleartextApi(apiUrl);

/** Sets the attribute on the manifest's <application>, in place. */
const allowCleartextInManifest = (androidManifest) => {
  const application = androidManifest.manifest.application?.[0];

  if (!application) {
    throw new Error(
      "withCleartextTraffic: the generated manifest has no <application>",
    );
  }

  application.$["android:usesCleartextTraffic"] = "true";

  return androidManifest;
};

module.exports = { allowCleartextInManifest, shouldAllowCleartext };
