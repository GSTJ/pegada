import { useEffect, useRef } from "react";

import { analytics } from "@/services/analytics";

/**
 * Where the prompt was rendered. Doubles as the share sheet's `source`, so
 * `Share Prompt Shown` to `Share Prompt Tapped` to `Dog Share` is one funnel
 * with one property to break it down by, rather than two vocabularies that
 * have to be mapped onto each other in the readout.
 */
export type SharePromptPlacement = "empty_deck" | "first_match";

export const trackSharePromptShown = (
  placement: SharePromptPlacement,
  dogId: string,
) =>
  analytics.track({
    event_type: "Share Prompt Shown",
    event_properties: { placement, dog_id: dogId },
  });

export const trackSharePromptTapped = (
  placement: SharePromptPlacement,
  dogId: string,
) =>
  analytics.track({
    event_type: "Share Prompt Tapped",
    event_properties: { placement, dog_id: dogId },
  });

/**
 * Fires `Share Prompt Shown` once per mount, the first render where the dog
 * is known. The card renders nothing until then, and the funnel's denominator
 * has to be prompts a user actually saw. Counting the loading pass would
 * inflate it by every mount that never painted.
 */
export const useSharePromptShown = (
  placement: SharePromptPlacement,
  dogId: string | undefined,
) => {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!dogId || hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackSharePromptShown(placement, dogId);
  }, [placement, dogId]);
};
