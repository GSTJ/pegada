/**
 * Two defects, both of which end with a CTA that does nothing.
 *
 * 1. `safeLoadAndShow` awaited the LOADED event with no bound. AdMob answers
 *    an unfillable request with ERROR, but a request that gets no answer at
 *    all produces neither event and the promise never settles. Every caller
 *    navigates after this resolves, so the button is dead with the screen
 *    still on it.
 * 2. In the Maestro build the interstitial is a full-screen view that eats
 *    every tap aimed at the screen behind it, on a schedule AdMob owns.
 *    22-new-match-journey.yaml budgets a blind 20s for it.
 */

// Metro defines this; jest does not. False is the shipping value, and it is
// what makes the module read the real ad unit ids rather than TestIds.
(globalThis as { __DEV__?: boolean }).__DEV__ = false;

const mockAd = {
  loaded: false,
  listeners: new Map<string, ((payload?: unknown) => void)[]>(),
  addAdEventListener(type: string, listener: (payload?: unknown) => void) {
    const existing = mockAd.listeners.get(type) ?? [];
    mockAd.listeners.set(type, [...existing, listener]);

    return () => {
      mockAd.listeners.set(
        type,
        (mockAd.listeners.get(type) ?? []).filter((it) => it !== listener),
      );
    };
  },
  removeAllListeners: () => mockAd.listeners.clear(),
  load: jest.fn(),
  // A real interstitial goes up and comes back down; the CLOSED listener is
  // registered before `show` is awaited, so emitting here is the shortest
  // faithful version of that.
  show: jest.fn(async () => {
    mockAd.emit("closed");
  }),
  emit(type: string) {
    for (const listener of mockAd.listeners.get(type) ?? []) listener();
  },
};

const mockConfig = { ENV: "development", MAESTRO_E2E: "0" };

jest.mock<Record<string, unknown>>("react-native", () => ({
  Platform: { select: (options: { ios: string }) => options.ios },
}));

jest.mock<Record<string, unknown>>("react-native-google-mobile-ads", () => ({
  AdEventType: {
    CLICKED: "clicked",
    CLOSED: "closed",
    ERROR: "error",
    LOADED: "loaded",
    OPENED: "opened",
  },
  InterstitialAd: { createForAdRequest: () => mockAd },
  TestIds: { INTERSTITIAL: "test-interstitial" },
}));

jest.mock<Record<string, unknown>>("@/hooks/use-payments", () => ({
  useUnsafeIsPremium: () => false,
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: () => undefined },
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: () => undefined,
}));

jest.mock<Record<string, unknown>>("@/services/config", () => ({
  get config() {
    return mockConfig;
  },
}));

import { AD_LOAD_TIMEOUT_MS, createForAdRequestTracked } from "./interstitial";

const AD_IDS = { android: "android-unit", ios: "ios-unit" };

/** Drain the microtask queue the async/await transform builds up. */
const flush = () =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

/** Whether a promise has settled, as of right now. */
const settled = async (promise: Promise<unknown>) => {
  const marker = Symbol("pending");

  return (
    (await Promise.race([
      promise.then(
        () => marker,
        () => marker,
      ),
      Promise.resolve(marker).then(() => "pending"),
    ])) !== "pending"
  );
};

beforeEach(() => {
  mockAd.listeners.clear();
  mockAd.loaded = false;
  mockConfig.ENV = "development";
  mockConfig.MAESTRO_E2E = "0";
  jest.useRealTimers();
});

describe("safeLoadAndShow", () => {
  it("gives up on an ad that never loads and never errors", async () => {
    jest.useFakeTimers();

    const { safeLoadAndShow } = createForAdRequestTracked(AD_IDS);
    const pending = safeLoadAndShow();

    // No LOADED, no ERROR — the case AdMob has no event for.
    await Promise.resolve();
    await expect(settled(pending)).resolves.toBe(false);

    jest.advanceTimersByTime(AD_LOAD_TIMEOUT_MS);

    await expect(pending).resolves.toBeUndefined();
    // The caller navigates instead of waiting; nothing was shown.
    expect(mockAd.show).not.toHaveBeenCalled();
  });

  it("still shows an ad that loads inside the budget", async () => {
    const { safeLoadAndShow } = createForAdRequestTracked(AD_IDS);
    const pending = safeLoadAndShow();

    await flush();
    mockAd.emit("loaded");

    await pending;

    expect(mockAd.show).toHaveBeenCalled();
  });

  it("is a no-op in the Maestro build, with no ad object at all", async () => {
    mockConfig.MAESTRO_E2E = "1";

    const { safeLoadAndShow, interstitial } = createForAdRequestTracked(AD_IDS);

    await expect(safeLoadAndShow()).resolves.toBeUndefined();
    expect(interstitial).not.toBe(mockAd);
    expect(mockAd.show).not.toHaveBeenCalled();
  });

  it("keeps the ad in a production build even with the flag set", async () => {
    mockConfig.ENV = "production";
    mockConfig.MAESTRO_E2E = "1";

    const { interstitial } = createForAdRequestTracked(AD_IDS);

    expect(interstitial).toBe(mockAd);
  });
});
