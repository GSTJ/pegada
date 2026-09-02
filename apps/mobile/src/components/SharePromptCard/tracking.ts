import type { SharePromptPlacement } from "@pegada/shared/analytics/events";

import { useEffect, useRef } from "react";

import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";

import { analytics } from "@/services/analytics";

/**
 * Where the prompt was rendered. Re-exported so the card can name a placement
 * without reaching past this module into the shared catalogue, which owns the
 * union because it is what types `Share Prompt Shown`, `Share Prompt Tapped`
 * and the share sheet's own `source`. Those three are one funnel with one
 * property to break it down by, rather than two vocabularies that have to be
 * mapped onto each other in the readout.
 */
export type { SharePromptPlacement };

export const trackSharePromptShown = (
  placement: SharePromptPlacement,
  dogId: string,
) =>
  analytics.track({
    event_type: ANALYTICS_EVENTS.SHARE_PROMPT_SHOWN,
    event_properties: { placement, dog_id: dogId },
  });

export const trackSharePromptTapped = (
  placement: SharePromptPlacement,
  dogId: string,
) =>
  analytics.track({
    event_type: ANALYTICS_EVENTS.SHARE_PROMPT_TAPPED,
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
