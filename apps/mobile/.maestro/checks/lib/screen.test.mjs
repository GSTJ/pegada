/**
 * `captureScreen` has to sample the device the flow actually ran on.
 *
 * Run with `pnpm -F @pegada/mobile test:checks`. The capture is stubbed: what
 * is under test is which device the command names, which is the whole defect.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { captureScreen } from "./screen.mjs";

const EMULATOR = "emulator-5584";
const SIMULATOR = "996C6E45-AE00-49F7-8673-B25CF9648F91";

/** A 2x1 Android `screencap` framebuffer: w, h, format, colour space, RGBA. */
const androidFrame = () => {
  const buffer = Buffer.alloc(16 + 2 * 4);
  buffer.writeUInt32LE(2, 0);
  buffer.writeUInt32LE(1, 4);
  buffer.writeUInt32LE(1, 8);
  buffer.set([10, 20, 30, 255, 40, 50, 60, 255], 16);
  return buffer;
};

const recording = (result) => {
  const calls = [];
  return {
    calls,
    exec: (command, args) => {
      calls.push([command, ...args]);
      return result;
    },
  };
};

describe("captureScreen", () => {
  it("pins adb to the resolved serial", () => {
    const { calls, exec } = recording(androidFrame());

    const screen = captureScreen({
      device: { platform: "android", id: EMULATOR },
      exec,
    });

    // Without `-s` adb picks whichever device it lists first. Two emulators
    // are routinely up on the harness machine, one of them another agent's,
    // so an unpinned capture measures a screen at random.
    assert.deepEqual(calls[0].slice(1), [
      "-s",
      EMULATOR,
      "exec-out",
      "screencap",
    ]);
    assert.equal(calls.length, 1);
    assert.deepEqual(screen.at(0, 0), [10, 20, 30]);
  });

  it("never reaches for simctl while measuring an emulator", () => {
    const { calls, exec } = recording(androidFrame());

    captureScreen({ device: { platform: "android", id: EMULATOR }, exec });

    // The original false green: the flow drove Android, the check screenshotted
    // the simulator that the shared env.sh also names, and it reported PASS.
    assert.equal(
      calls.some(([command]) => command === "xcrun"),
      false,
    );
    assert.equal(
      calls.some((call) => call.includes(SIMULATOR)),
      false,
    );
  });

  it("names the simulator explicitly rather than 'booted'", () => {
    const { calls, exec } = recording(Buffer.alloc(0));

    // The BMP decode is expected to fail on an empty buffer; the command is
    // already recorded by then.
    assert.throws(() =>
      captureScreen({ device: { platform: "ios", id: SIMULATOR }, exec }),
    );

    assert.deepEqual(calls[0].slice(0, 4), [
      "xcrun",
      "simctl",
      "io",
      SIMULATOR,
    ]);
  });
});
