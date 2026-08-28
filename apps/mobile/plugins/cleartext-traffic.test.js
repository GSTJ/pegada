// @ts-nocheck
const {
  allowCleartextInManifest,
  shouldAllowCleartext,
} = require("./cleartext-traffic");

/**
 * The defect this guards: expo prebuild emits no `usesCleartextTraffic`, so a
 * Release build pointed at an http:// API cannot reach it, and every capture
 * round patched the GENERATED manifest by hand — output that
 * `expo prebuild --clean` deletes.
 */

const manifestFixture = () => ({
  manifest: {
    application: [{ $: { "android:name": ".MainApplication" } }],
  },
});

/** What the plugin does, given an environment. */
const applied = (env) => {
  const androidManifest = manifestFixture();

  if (shouldAllowCleartext(env)) allowCleartextInManifest(androidManifest);

  return androidManifest.manifest.application[0].$;
};

describe("cleartext traffic", () => {
  it("is allowed for a build pointed at an http API", () => {
    expect(
      applied({
        apiUrl: "http://localhost:3010/api",
        appEnv: "development",
      }),
    ).toHaveProperty("android:usesCleartextTraffic", "true");
  });

  it("is not touched for an https build", () => {
    expect(
      applied({ apiUrl: "https://pegada.app/api", appEnv: "development" }),
    ).not.toHaveProperty("android:usesCleartextTraffic");
  });

  it("is refused in production even when the URL is http", () => {
    expect(
      applied({ apiUrl: "http://localhost:3010/api", appEnv: "production" }),
    ).not.toHaveProperty("android:usesCleartextTraffic");
  });

  it("is not touched when there is no API URL", () => {
    expect(applied({ apiUrl: "", appEnv: "development" })).not.toHaveProperty(
      "android:usesCleartextTraffic",
    );
  });

  it("refuses a manifest with no <application> rather than silently passing", () => {
    expect(() => allowCleartextInManifest({ manifest: {} })).toThrow(
      /no <application>/,
    );
  });
});
