/**
 * No post-check may invoke `maestro` without naming the device.
 *
 * `lib/device.mjs` exists because a check that picks its own device picks the
 * wrong one: the shared harness env sets `SIM_UDID` and `ANDROID_SERIAL`
 * together, so an Android run whose check screenshots the simulator reports a
 * green that describes a different phone. Every check that measures geometry
 * was routed through `resolveDevice` for that reason.
 *
 * `checks/01-launch.sh` was not. It shelled out to a bare `maestro hierarchy`,
 * which does not silently pick a device — with an emulator and a simulator
 * both up it refuses:
 *
 *     Multiple devices connected. Please specify a device using --device <id>.
 *
 * so flow 01 failed on a machine where the app was alive and on SignIn. Loud,
 * but wrong, and indistinguishable from a launch crash in the log.
 *
 * A grep is the right shape for this: the defect is not in any one check's
 * logic, it is a rule about how all of them are allowed to reach a device, and
 * the next check someone adds is the one that will break it.
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

const CHECKS = dirname(import.meta.dirname);

/** Lines that run `maestro` as a command, comments and prose excluded. */
const maestroInvocations = (source) =>
  source
    .split("\n")
    .filter((line) => {
      const code = line.trim();
      if (
        code.startsWith("#") ||
        code.startsWith("*") ||
        code.startsWith("//")
      ) {
        return false;
      }
      // `maestro` as a command word: start of a line, or after a pipe, `&&`,
      // `if`, `exec`, `$(` etc. Not `"maestro"` inside a string argument list,
      // which is how lib/hierarchy.mjs spells its already-pinned call.
      return /(^|[|;&(]|\b(?:if|exec|then|else|do)\s+)\s*maestro\s/.test(code);
    })
    .map((line) => line.trim());

const files = readdirSync(CHECKS, { withFileTypes: true })
  .filter((entry) => entry.isFile() && /\.(sh|mjs)$/.test(entry.name))
  .map((entry) => entry.name);

describe("post-checks name the device they measure", () => {
  it("finds check scripts to inspect", () => {
    assert.ok(files.length > 0, `no check scripts under ${CHECKS}`);
  });

  for (const name of files) {
    it(`${name} never runs an unpinned maestro`, () => {
      const source = readFileSync(join(CHECKS, name), "utf8");
      const unpinned = maestroInvocations(source).filter(
        (line) => !line.includes("--device"),
      );

      assert.deepEqual(
        unpinned,
        [],
        `${name} runs maestro without --device. With an emulator and a ` +
          `simulator both attached maestro refuses ("Multiple devices ` +
          `connected"), so the check fails on a healthy app. Resolve the ` +
          `device with lib/device.mjs and pass --device.`,
      );
    });
  }
});
