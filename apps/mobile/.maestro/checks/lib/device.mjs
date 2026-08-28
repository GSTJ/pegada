/**
 * Which device is this post-check allowed to look at?
 *
 * Every check in here measures something outside Maestro's selector language —
 * a frame buffer, a node's bounds, the IME's inset. All of that is read with a
 * second tool (`simctl`, `adb`, `maestro hierarchy`) pointed at a device *the
 * check chooses for itself*, which is where the trouble was: the choice used
 * to be `process.env.SIM_UDID ?? "booted"` on one side and
 * `MAESTRO_DEVICE_ID ?? SIM_UDID` on the other, with the platform defaulting
 * to "ios".
 *
 * The Android runner sources the same `env.sh` as the iOS one, so `SIM_UDID`
 * is set there too. Run flow 35 against an emulator and the flow drove Android
 * while its check screenshotted the simulator — and reported PASS. A green
 * that describes a different device is worse than a red, because nothing about
 * it looks wrong.
 *
 * So this module never falls back. It resolves a device, proves the device is
 * really attached on the platform claimed for it, and throws otherwise. When
 * the environment describes both an emulator and a simulator and nothing says
 * which one the flow ran on, that is not a tie to be broken by a default — it
 * throws and asks for `MAESTRO_PLATFORM`.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const run = (command, args) =>
  execFileSync(command, args, {
    maxBuffer: 8 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).toString();

/**
 * `adb`, preferring the SDK the rest of the harness uses.
 *
 * A bare `adb` is only on PATH if the caller sourced an env that put it there.
 * When it is not, the failure surfaces as ENOENT from inside a geometry helper
 * and reads like the helper is broken.
 */
export const adbBinary = (env = process.env) => {
  const sdk = env.ANDROID_HOME ?? env.ANDROID_SDK_ROOT;
  if (sdk) {
    const candidate = join(sdk, "platform-tools", "adb");
    if (existsSync(candidate)) return candidate;
  }
  return "adb";
};

/** Serials adb currently reports as `device` (not `offline`/`unauthorized`). */
export const listAndroidSerials = (env = process.env) => {
  try {
    return run(adbBinary(env), ["devices"])
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/))
      .filter(([serial, state]) => serial && state === "device")
      .map(([serial]) => serial);
  } catch {
    // No adb, or no server. That is a legitimate state on an iOS-only machine,
    // and it is the *caller's* platform claim that decides whether it matters.
    return [];
  }
};

/** UDIDs of booted simulators. */
export const listBootedSimulators = () => {
  try {
    const parsed = JSON.parse(
      run("xcrun", ["simctl", "list", "devices", "booted", "--json"]),
    );
    return Object.values(parsed.devices ?? {})
      .flat()
      .map((device) => device.udid)
      .filter(Boolean);
  } catch {
    return [];
  }
};

const describe = (androidSerials, simulatorUdids) =>
  `attached android: [${androidSerials.join(", ") || "none"}]; ` +
  `booted simulators: [${simulatorUdids.join(", ") || "none"}]`;

const pin = (platform, wanted, attached, all) => {
  if (wanted) {
    if (!attached.includes(wanted)) {
      throw new Error(
        `MAESTRO_PLATFORM=${platform} names device '${wanted}', which is not ` +
          `there. ${all}. Refusing to measure a different device.`,
      );
    }
    return { platform, id: wanted };
  }

  if (attached.length === 1) return { platform, id: attached[0] };

  throw new Error(
    attached.length === 0
      ? `MAESTRO_PLATFORM=${platform} but nothing is available to measure. ${all}.`
      : `MAESTRO_PLATFORM=${platform} matches ${attached.length} devices and ` +
          `nothing says which one the flow ran on. ${all}. Set ` +
          `MAESTRO_DEVICE_ID.`,
  );
};

/** An explicit MAESTRO_DEVICE_ID with no platform: only one may claim it. */
const byId = (id, android, ios, all) => {
  const onAndroid = android.includes(id);
  const onIos = ios.includes(id);
  if (onAndroid && !onIos) return { platform: "android", id };
  if (onIos && !onAndroid) return { platform: "ios", id };

  throw new Error(
    `MAESTRO_DEVICE_ID='${id}' ` +
      `${onAndroid ? "is on both platforms" : "is not attached anywhere"}. ` +
      `${all}. Set MAESTRO_PLATFORM.`,
  );
};

/**
 * No platform and no device id — work it out from what is actually up.
 *
 * The hints only count when they point somewhere real, and `env.sh` sets BOTH
 * on BOTH runners, so two live hints is not a tie to break: it is the exact
 * shape of the false green, and it throws.
 */
const infer = (hints, android, ios, all) => {
  const candidates = [];
  if (hints.android && android.includes(hints.android)) {
    candidates.push({ platform: "android", id: hints.android });
  }
  if (hints.ios && ios.includes(hints.ios)) {
    candidates.push({ platform: "ios", id: hints.ios });
  }
  if (candidates.length === 1) return candidates[0];

  if (candidates.length === 0) {
    if (android.length === 1 && ios.length === 0) {
      return { platform: "android", id: android[0] };
    }
    if (ios.length === 1 && android.length === 0) {
      return { platform: "ios", id: ios[0] };
    }
  }

  throw new Error(
    `Cannot tell which device this flow ran on. ${all}; ` +
      `SIM_UDID='${hints.ios ?? ""}', ANDROID_SERIAL='${hints.android ?? ""}'. ` +
      `Set MAESTRO_PLATFORM (and MAESTRO_DEVICE_ID when more than one device ` +
      `of that platform is up).`,
  );
};

/**
 * The device this check may read, and the platform it is on.
 *
 * The lookups are injectable so the resolution rules can be tested without an
 * emulator, a simulator, or an SDK.
 *
 * @returns {{ platform: "ios" | "android", id: string }}
 */
export const resolveDevice = ({
  env = process.env,
  androidSerials = () => listAndroidSerials(env),
  simulatorUdids = listBootedSimulators,
} = {}) => {
  const declared = env.MAESTRO_PLATFORM?.trim().toLowerCase();
  const explicit = env.MAESTRO_DEVICE_ID?.trim();
  const hints = {
    android: env.ANDROID_SERIAL?.trim(),
    ios: env.SIM_UDID?.trim(),
  };

  if (declared && declared !== "ios" && declared !== "android") {
    throw new Error(
      `MAESTRO_PLATFORM='${declared}' is neither 'ios' nor 'android'.`,
    );
  }

  const android = androidSerials();
  const ios = simulatorUdids();
  const all = describe(android, ios);

  if (declared === "android") {
    return pin("android", explicit || hints.android, android, all);
  }
  if (declared === "ios") return pin("ios", explicit || hints.ios, ios, all);
  if (explicit) return byId(explicit, android, ios, all);

  return infer(hints, android, ios, all);
};

/**
 * `adb` bound to the resolved serial.
 *
 * Every `adb` call in these checks has to carry `-s`: this machine routinely
 * has two emulators up, one of them another agent's, and an unpinned adb picks
 * whichever it lists first — or refuses with "more than one device".
 */
export const androidShell = (device, ...args) => {
  if (device.platform !== "android") {
    throw new Error(`androidShell called on ${device.platform}`);
  }
  return run(adbBinary(), ["-s", device.id, ...args]);
};
