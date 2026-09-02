import { useEffect } from "react";

import * as Linking from "expo-linking";

import { isReferralId } from "@pegada/shared/utils/referral";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";

import { parseReferralFromUrl } from "./parse-referral-from-url";
import { savePendingReferral } from "./pending-referral";

/**
 * Read the referral off whichever link opened the app, and put it on disk
 * before anything else needs it.
 *
 * Two entry points, because a link reaches a React Native app two different
 * ways and only one of them is an event. A cold start has already happened by
 * the time this effect runs, so the URL is fetched; a warm link arrives while
 * the app is alive, and is listened for. Handling only the second is the
 * classic version of this bug: it works every time you test it with the app
 * already open, and never for the install it was written for.
 */
const capture = async (url: string | null, cold: boolean) => {
  const referral = parseReferralFromUrl(url);
  if (!referral) return;

  const stored = await savePendingReferral(referral);

  // Nothing stored means either a write that failed, or an earlier referral
  // that keeps its claim. Neither is this link's capture to report.
  if (stored !== referral) return;

  analytics.track({
    event_type: "Referral Captured",
    event_properties: {
      ref: referral.ref,
      // Only the server can say whether this id names a real account. The app
      // reports the shape it saw, so a channel token (`ig`) and a user link
      // are still tellable apart in the funnel before signup.
      referredByUserId: isReferralId(referral.ref) ? referral.ref : null,
      referredDogId: referral.referredDogId ?? null,
      cold,
    },
  });
};

export const useCaptureReferral = () => {
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => capture(url, true))
      .catch(sendError);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      capture(url, false).catch(sendError);
    });

    return () => {
      subscription.remove();
    };
  }, []);
};
