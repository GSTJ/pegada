// @ts-nocheck
/**
 * Expo config plugin: sets `android:usesCleartextTraffic="true"` on the
 * generated AndroidManifest, but only when the app is built to talk to a
 * plaintext API.
 *
 * Why this exists:
 *   Android blocks cleartext HTTP by default from API 28 on, and expo
 *   prebuild does not emit `usesCleartextTraffic` at all. So a Release build
 *   pointed at `http://localhost:3010/api` — which is every local E2E and QA
 *   build — cannot reach its API. There is no useful error: requests fail at
 *   the network layer and it looks like the server went away.
 *
 *   Every Android capture round in this repo worked around it by editing the
 *   GENERATED manifest by hand, which `expo prebuild --clean` deletes, so it
 *   had to be redone per build and rediscovered per machine
 *   (.unistyles-migration/tour-android-main/MANIFEST.md, workaround 2).
 *
 * The decision and the edit live in `./cleartext-traffic` so they can be
 * tested; this file is only the wiring.
 */
const { withAndroidManifest } = require("expo/config-plugins");

const {
  allowCleartextInManifest,
  shouldAllowCleartext,
} = require("./cleartext-traffic");

const withCleartextTraffic = (config) =>
  withAndroidManifest(config, (modConfig) => {
    const allow = shouldAllowCleartext({
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      appEnv: process.env.EXPO_PUBLIC_ENV,
    });

    if (allow) allowCleartextInManifest(modConfig.modResults);

    return modConfig;
  });

module.exports = withCleartextTraffic;
