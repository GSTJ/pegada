import { buildOtaUpdateProperties } from "./ota-properties";

/**
 * The builder is the only thing standing between a readout that can prove an
 * update arrived and one that reports `undefined` for every device. Its whole
 * job is the awkward cases: a development client where the native module
 * answers nothing, and a `Date` that PostHog would otherwise store as an
 * object.
 */
describe("buildOtaUpdateProperties", () => {
  it("reports the update a downloaded bundle came from", () => {
    expect(
      buildOtaUpdateProperties({
        updateId: "0c2f3f10-6f2b-4a54-9f0f-9d0a1c3b7e21",
        isEmbeddedLaunch: false,
        runtimeVersion: "1.6.2",
        channel: "production",
        createdAt: new Date("2026-09-04T12:30:00.000Z"),
      }),
    ).toStrictEqual({
      ota_update_id: "0c2f3f10-6f2b-4a54-9f0f-9d0a1c3b7e21",
      ota_is_embedded: false,
      runtime_version: "1.6.2",
      ota_channel: "production",
      ota_created_at: "2026-09-04T12:30:00.000Z",
    });
  });

  it("keeps the embedded launch distinguishable from a downloaded one", () => {
    // A store install that has not fetched anything yet still has an update id
    // and a creation date: they describe the bundle baked into the binary.
    expect(
      buildOtaUpdateProperties({
        updateId: "embedded-update-id",
        isEmbeddedLaunch: true,
        runtimeVersion: "1.6.2",
        channel: "production",
        createdAt: new Date("2026-07-01T00:00:00.000Z"),
      }).ota_is_embedded,
    ).toBe(true);
  });

  it("returns nulls in a development client where nothing is defined", () => {
    expect(buildOtaUpdateProperties({})).toStrictEqual({
      ota_update_id: null,
      ota_is_embedded: null,
      runtime_version: null,
      ota_channel: null,
      ota_created_at: null,
    });
  });

  it("does not turn an unknown embedded state into a false one", () => {
    // `false` would be a claim that the device downloaded an update. Silence is
    // the honest answer when the module is disabled.
    expect(buildOtaUpdateProperties({}).ota_is_embedded).toBeNull();
    expect(
      buildOtaUpdateProperties({ isEmbeddedLaunch: false }).ota_is_embedded,
    ).toBe(false);
  });

  it("treats explicit nulls the same as missing values", () => {
    expect(
      buildOtaUpdateProperties({
        updateId: null,
        runtimeVersion: null,
        channel: null,
        createdAt: null,
      }),
    ).toStrictEqual({
      ota_update_id: null,
      ota_is_embedded: null,
      runtime_version: null,
      ota_channel: null,
      ota_created_at: null,
    });
  });

  it("drops empty strings so they cannot look like a real update", () => {
    expect(
      buildOtaUpdateProperties({ updateId: "", runtimeVersion: "" }),
    ).toMatchObject({ ota_update_id: null, runtime_version: null });
  });

  it("accepts a creation date that already arrived as a string", () => {
    expect(
      buildOtaUpdateProperties({ createdAt: "2026-09-04T12:30:00.000Z" })
        .ota_created_at,
    ).toBe("2026-09-04T12:30:00.000Z");
  });

  it("ignores an unusable date rather than sending Invalid Date", () => {
    expect(
      buildOtaUpdateProperties({ createdAt: new Date("nonsense") })
        .ota_created_at,
    ).toBeNull();
  });
});
