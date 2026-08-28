import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import {
  AdEventType,
  InterstitialAd,
  TestIds,
} from "react-native-google-mobile-ads";

import { useUnsafeIsPremium } from "@/hooks/use-payments";
import { analytics } from "@/services/analytics";
import { isMaestroE2EBuild } from "@/services/e2e";
import { sendError } from "@/services/error-tracking";

const DEFAULT_AD_KEYWORDS = ["dog", "animals", "pets", "puppies"];

/**
 * How long an interstitial gets to load before the caller stops waiting for
 * it.
 *
 * Callers `await safeLoadAndShow()` and then navigate, so this wait is the
 * user's wait: on NewMatch, both "Send a Message" and "Keep Swiping" sit
 * behind it. AdMob answers a request that cannot be filled with an ERROR
 * event, but a request that never gets an answer at all — no fill in a slow
 * region, a network that accepted the connection and went quiet — produces
 * neither LOADED nor ERROR, and the promise below never settles. The button
 * is then simply dead, with the screen still on it.
 *
 * Five seconds is longer than a normal fill (hundreds of ms) and short enough
 * that a user who hits the bad case reads it as slow rather than broken.
 */
export const AD_LOAD_TIMEOUT_MS = 5_000;

/** Distinguishable from any value an ad event could resolve with. */
const TIMED_OUT = Symbol("ad-load-timed-out");

const withTimeout = async <T>(promise: Promise<T>, ms: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/** What every suppressed path returns: present, inert, resolves immediately. */
const noInterstitial = () => ({
  interstitial: { load: () => {} },
  safeLoadAndShow: async () => {},
});

export const createForAdRequestTracked = (
  interstitialAdIds: { ios: string; android: string },
  keywords = DEFAULT_AD_KEYWORDS,
): {
  interstitial: {
    load: () => void;
  };
  safeLoadAndShow: () => Promise<void>;
} => {
  // A full-screen interstitial in an E2E build eats every tap aimed at the
  // screen behind it for as long as it is up, and it appears on a schedule
  // AdMob owns, so no flow can wait for it deterministically —
  // 22-new-match-journey.yaml budgets a blind 20s for exactly this. Suppressed
  // outright in the Maestro build; see isMaestroE2EBuild for why it cannot
  // leak into a shipped one.
  if (isMaestroE2EBuild()) return noInterstitial();

  const interstitialAdId = Platform.select(interstitialAdIds);

  const adId = __DEV__ ? TestIds.INTERSTITIAL : (interstitialAdId ?? "");

  const interstitial = InterstitialAd.createForAdRequest(adId, {
    requestNonPersonalizedAdsOnly: false,
    keywords,
  });

  const waitForEvent = (type: AdEventType) => {
    return new Promise((resolve, reject) => {
      interstitial.addAdEventListener(type, resolve);
      interstitial.addAdEventListener(AdEventType.ERROR, reject);
    });
  };

  const trackAdEvents = () => {
    const trackEventTypes = [
      AdEventType.LOADED,
      AdEventType.OPENED,
      AdEventType.CLOSED,
      AdEventType.CLICKED,
    ];

    for (const eventType of trackEventTypes) {
      interstitial.addAdEventListener(eventType, () => {
        analytics.track({
          event_type: "Advertisement",
          event_properties: { action: eventType, type: "Interstitial" },
        });
      });
    }
  };

  trackAdEvents();

  const adLoadedPromise = waitForEvent(AdEventType.LOADED);

  // Used to catch errors before the AD is loaded
  const removeErrorListener = interstitial.addAdEventListener(
    AdEventType.ERROR,
    sendError,
  );

  const safeLoadAndShow = async () => {
    try {
      // Remove the error listener so we don't send errors twice
      removeErrorListener();

      // Bounded: the caller navigates once this resolves, so an ad that never
      // loads and never errors would leave the button dead forever. Timing out
      // means no ad this time, not no navigation.
      const loaded =
        interstitial.loaded ||
        (await withTimeout(adLoadedPromise, AD_LOAD_TIMEOUT_MS)) !== TIMED_OUT;

      if (!loaded) return;

      const adClosedPromise = waitForEvent(AdEventType.CLOSED);

      await interstitial.show();

      await adClosedPromise;
    } catch (error) {
      sendError(error);
    } finally {
      interstitial.removeAllListeners();
    }
  };

  return {
    interstitial,
    safeLoadAndShow,
  };
};

type AdRequest = ReturnType<typeof createForAdRequestTracked>;

/**
 * Holds one value, rebuilt only when its key changes.
 *
 * `createForAdRequestTracked` is not a pure function of its arguments: it
 * constructs an InterstitialAd, registers listeners on it and starts an ad
 * request. Called straight from a hook body it therefore ran on EVERY render
 * of the screen, and since each call returned a fresh object, the `useEffect`
 * below saw a new dependency every time and fired `load()` again. One
 * NewMatch mount was worth as many ad objects, listener sets and network
 * requests as it had renders.
 *
 * Deliberately a slot per hook instance rather than a module-level cache:
 * `safeLoadAndShow` ends with `removeAllListeners()`, so an interstitial that
 * outlived its screen would come back stripped of the LOADED promise and the
 * analytics listeners it was built with.
 *
 * Exported for the test — this is the part with the bug in it.
 */
export const createAdRequestSlot = () => {
  let current: { key: string; value: AdRequest } | undefined;

  return (key: string, create: () => AdRequest): AdRequest => {
    if (current?.key !== key) current = { key, value: create() };

    return current.value;
  };
};

export const useForAdRequestTracked: typeof createForAdRequestTracked = (
  interstitialAdIds,
  keywords = DEFAULT_AD_KEYWORDS,
) => {
  // Premium users never see an ad. Part of the key rather than an early
  // return, so upgrading mid-session swaps the inert object in.
  const isPremium = useUnsafeIsPremium();

  const slot = useRef(createAdRequestSlot()).current;

  const result = slot(
    `${isPremium}|${interstitialAdIds.ios}|${interstitialAdIds.android}|${keywords.join(",")}`,
    () =>
      isPremium
        ? noInterstitial()
        : createForAdRequestTracked(interstitialAdIds, keywords),
  );

  useEffect(() => {
    result.interstitial.load();
  }, [result]);

  return result;
};
