/**
 * The rules that stop a post-check from measuring the wrong device.
 *
 * Run with `node --test apps/mobile/.maestro/checks/lib` (or
 * `pnpm -F @pegada/mobile test:checks`). No emulator, no simulator, no SDK:
 * the device lookups are injected, because what is under test is the decision,
 * not the tooling.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveDevice } from "./device.mjs";

const EMULATOR = "emulator-5584";
const SIMULATOR = "996C6E45-AE00-49F7-8673-B25CF9648F91";

/** What `.unistyles-migration/qa-kb/env.sh` leaves in the environment. */
const SHARED_ENV = { ANDROID_SERIAL: EMULATOR, SIM_UDID: SIMULATOR };

const resolve = (env, { android = [], ios = [] } = {}) =>
  resolveDevice({
    env,
    androidSerials: () => android,
    simulatorUdids: () => ios,
  });

describe("resolveDevice", () => {
  it("uses the emulator the Android runner pinned", () => {
    assert.deepEqual(
      resolve(
        {
          ...SHARED_ENV,
          MAESTRO_PLATFORM: "android",
          MAESTRO_DEVICE_ID: EMULATOR,
        },
        { android: [EMULATOR], ios: [SIMULATOR] },
      ),
      { platform: "android", id: EMULATOR },
    );
  });

  it("falls back to ANDROID_SERIAL when only the platform is declared", () => {
    assert.deepEqual(
      resolve(
        { ...SHARED_ENV, MAESTRO_PLATFORM: "android" },
        { android: [EMULATOR], ios: [SIMULATOR] },
      ),
      { platform: "android", id: EMULATOR },
    );
  });

  it("refuses to guess when the environment describes both platforms", () => {
    // This is the false green. The shared env.sh sets SIM_UDID on the Android
    // runner too, so the old `platform = MAESTRO_PLATFORM ?? "ios"` default
    // sent the check to the simulator while the flow drove the emulator — and
    // the check passed, describing a screen nobody was testing.
    assert.throws(
      () => resolve(SHARED_ENV, { android: [EMULATOR], ios: [SIMULATOR] }),
      /Cannot tell which device this flow ran on/,
    );
  });

  it("refuses a device that is not on the platform it was claimed for", () => {
    assert.throws(
      () =>
        resolve(
          { MAESTRO_PLATFORM: "android", MAESTRO_DEVICE_ID: SIMULATOR },
          { android: [EMULATOR], ios: [SIMULATOR] },
        ),
      /not there.*Refusing to measure a different device/s,
    );
  });

  it("refuses a stale serial rather than picking a live one", () => {
    assert.throws(
      () =>
        resolve(
          { MAESTRO_PLATFORM: "android", ANDROID_SERIAL: "emulator-5554" },
          { android: [EMULATOR] },
        ),
      /is not there/,
    );
  });

  it("names the ambiguity when two emulators are up", () => {
    assert.throws(
      () =>
        resolve(
          { MAESTRO_PLATFORM: "android" },
          { android: [EMULATOR, "emulator-5554"] },
        ),
      /Set MAESTRO_DEVICE_ID/,
    );
  });

  it("infers the platform from an unambiguous device id", () => {
    assert.deepEqual(
      resolve(
        { ...SHARED_ENV, MAESTRO_DEVICE_ID: EMULATOR },
        { android: [EMULATOR], ios: [SIMULATOR] },
      ),
      { platform: "android", id: EMULATOR },
    );
  });

  it("takes the only device up when nothing is declared", () => {
    assert.deepEqual(resolve({}, { ios: [SIMULATOR] }), {
      platform: "ios",
      id: SIMULATOR,
    });
    assert.deepEqual(resolve({}, { android: [EMULATOR] }), {
      platform: "android",
      id: EMULATOR,
    });
  });

  it("fails when the declared platform has nothing on it", () => {
    assert.throws(
      () => resolve({ MAESTRO_PLATFORM: "android" }, { ios: [SIMULATOR] }),
      /nothing is available to measure/,
    );
  });

  it("rejects a platform it does not know", () => {
    assert.throws(
      () => resolve({ MAESTRO_PLATFORM: "web" }),
      /neither 'ios' nor 'android'/,
    );
  });
});
