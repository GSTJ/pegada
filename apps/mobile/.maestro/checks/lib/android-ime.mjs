/**
 * Soft-keyboard geometry, read from the Android window manager.
 *
 * Why this exists at all: on Android the app window does NOT resize when the
 * IME appears. The app opts into edge-to-edge (`react-native-edge-to-edge`),
 * and from Android 15 that makes `android:windowSoftInputMode="adjustResize"`
 * a no-op — the IME is delivered as a window inset the app has to consume
 * itself. So "is this field behind the keyboard" cannot be answered from the
 * view hierarchy alone: every node keeps the coordinates it had before the
 * keyboard came up.
 *
 * Two independent signals are available, and the checks use both:
 *
 *  1. Occlusion. A view under the IME drops out of the accessibility tree
 *     entirely, so `assertVisible` in the flow YAML already fails — that is
 *     the platform-agnostic half, and it lives in the flows.
 *  2. Geometry. `dumpsys window` reports the IME's inset frame in pixels.
 *     Comparing it against a node's bounds says by how much a field clears
 *     the keyboard, which is what turns "it happens to pass" into a number.
 *
 * iOS needs neither: `KeyboardAvoidingView` shrinks the scroll area there and
 * the tour reproduced none of these findings on it. Every helper below returns
 * `null` off Android so a shared check can degrade to (1) alone.
 */

import { androidShell, resolveDevice } from "./device.mjs";

// Resolved once per process: every helper below wants the same device, and
// `resolveDevice` shells out to `adb devices` / `simctl list`.
let resolved;
const device = () => (resolved ??= resolveDevice());

/**
 * The resolved device when it is an emulator/handset, else null.
 *
 * Was `MAESTRO_PLATFORM ?? "ios"`, i.e. "assume iOS unless told otherwise" —
 * so an Android run that forgot the variable silently reported "not Android"
 * and every geometry assertion below degraded to null without saying so.
 */
const androidDevice = () => {
  const current = device();
  return current.platform === "android" ? current : null;
};

const isAndroid = () => androidDevice() !== null;

/** `adb` pinned to the resolved serial — never the first device it lists. */
const adb = (...args) => androidShell(device(), ...args);

/** Device pixels per dp. `maestro hierarchy` reports Android bounds in pixels. */
export const density = () => {
  if (!isAndroid()) return null;
  const raw = adb("shell", "wm", "density");
  const match = /Override density:\s*(\d+)|Physical density:\s*(\d+)/g;
  let dpi = null;
  for (const found of raw.matchAll(match)) {
    dpi = Number(found[1] ?? found[2]);
  }
  return dpi ? dpi / 160 : null;
};

/**
 * Whether the soft keyboard is actually on screen.
 *
 * `mInputShown` is the InputMethodManagerService's own view of it, which is
 * the only thing that stays true while the app believes a field is focused
 * but the IME has already gone (the "orphaned keyboard" finding is the
 * opposite case: no focused field, IME still up).
 *
 * @returns {boolean|null} null off Android.
 */
export const keyboardShown = () => {
  if (!isAndroid()) return null;
  const raw = adb("shell", "dumpsys", "input_method");
  const match = /mInputShown=(true|false)/.exec(raw);
  return match ? match[1] === "true" : null;
};

/** The `inputType` of the EditText the IME is currently serving, or null. */
export const servedInputType = () => {
  if (!isAndroid()) return null;
  const raw = adb("shell", "dumpsys", "input_method");
  // The first `inputType=` under mCurAttribute is the served field's.
  const match = /inputType=0x([0-9a-f]+)/.exec(raw);
  return match ? Number.parseInt(match[1], 16) : null;
};

/**
 * Top edge of the IME window, in PIXELS, or null when the keyboard is down
 * (or off Android).
 *
 * Read from the ime `InsetsSource`, not from the IME's own window frame: the
 * inset frame is what an app is supposed to consume, and it is the line the
 * app's content has to stay above.
 */
export const keyboardTopPx = () => {
  if (!isAndroid()) return null;
  const raw = adb("shell", "dumpsys", "window");
  const match =
    /InsetsSource id=\d+ type=ime frame=\[\d+,(\d+)]\[\d+,(\d+)] .*?visible=(true|false)/.exec(
      raw,
    );
  if (!match) return null;
  if (match[3] !== "true") return null;
  return Number(match[1]);
};

/** Bottom navigation-bar inset in pixels (0 when there is none). */
export const navigationBarInsetPx = () => {
  if (!isAndroid()) return null;
  const raw = adb("shell", "dumpsys", "window");
  const match =
    /mType=navigationBars .*?mInsetsHint=Insets\{left=\d+, top=\d+, right=\d+, bottom=(\d+)}/.exec(
      raw,
    );
  return match ? Number(match[1]) : null;
};

/** Status-bar inset in pixels (the strip the system paints its icons in). */
export const statusBarInsetPx = () => {
  if (!isAndroid()) return null;
  const raw = adb("shell", "dumpsys", "window");
  const match =
    /mType=statusBars .*?mInsetsHint=Insets\{left=\d+, top=(\d+), right=\d+, bottom=\d+}/.exec(
      raw,
    );
  return match ? Number(match[1]) : null;
};

export { isAndroid };
