import { useEffect } from "react";
import { Platform } from "react-native";
import {
  AdEventType,
  InterstitialAd,
  TestIds
} from "react-native-google-mobile-ads";

import { useUnsafeIsPremium } from "@/hooks/usePayments";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";

const DEFAULT_AD_KEYWORDS = ["dog", "animals", "pets", "puppies"];

export const createForAdRequestTracked = (
  interstitialAdIds: { ios: string; android: string },
  keywords = DEFAULT_AD_KEYWORDS
): {
  interstitial: {
    load: () => void;
  };
  safeLoadAndShow: () => Promise<void>;
} => {
  const interstitialAdId = Platform.select(interstitialAdIds);

  const adId = __DEV__ ? TestIds.INTERSTITIAL : (interstitialAdId ?? "");

  const interstitial = InterstitialAd.createForAdRequest(adId, {
    requestNonPersonalizedAdsOnly: false,
    keywords
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
      AdEventType.CLICKED
    ];

    for (const eventType of trackEventTypes) {
      interstitial.addAdEventListener(eventType, () => {
        analytics.track({
          event_type: "Advertisement",
          event_properties: { action: eventType, type: "Interstitial" }
        });
      });
    }
  };

  trackAdEvents();

  const adLoadedPromise = waitForEvent(AdEventType.LOADED);

  // Used to catch errors before the AD is loaded
  const removeErrorListener = interstitial.addAdEventListener(
    AdEventType.ERROR,
    sendError
  );

  const safeLoadAndShow = async () => {
    try {
      // Remove the error listener so we don't send errors twice
      removeErrorListener();

      if (!interstitial.loaded) {
        await adLoadedPromise;
      }

      const adClosedPromise = waitForEvent(AdEventType.CLOSED);

      await interstitial.show();

      await adClosedPromise;
    } catch (err) {
      sendError(err);
    } finally {
      interstitial.removeAllListeners();
    }
  };

  return {
    interstitial,
    safeLoadAndShow
  };
};

/** The same as above, but mocked for Premium users. We don't show them ads, ever. */
const useCreateFreeOnlyForAdRequestTracked: typeof createForAdRequestTracked = (
  interstitialAdIds,
  keywords
) => {
  const isPremium = useUnsafeIsPremium();

  if (isPremium) {
    // Mock the interstitial ad
    return {
      interstitial: { load: () => {} },
      safeLoadAndShow: async () => {}
    };
  }

  return createForAdRequestTracked(interstitialAdIds, keywords);
};

export const useForAdRequestTracked: typeof createForAdRequestTracked = (
  interstitialAdIds,
  keywords
) => {
  const result = useCreateFreeOnlyForAdRequestTracked(
    interstitialAdIds,
    keywords
  );

  useEffect(() => {
    result.interstitial.load();
  }, [result]);

  return result;
};
