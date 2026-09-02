import type { FakeDoorFeature, FakeDoorSource } from "./types";

import { analytics } from "@/services/analytics";

/**
 * The three stages of a fake door, kept as separate event names rather than
 * one name with a `type` property: the readout is a funnel across surfaces
 * (`Shown` to `Tapped` to `Notify Toggled`), and the last stage carries a
 * different property set from the first two.
 */

/** Fired once per surface that renders the row, not once per feature tap. */
export const trackFakeDoorShown = (
  feature: FakeDoorFeature,
  source: FakeDoorSource,
) =>
  analytics.track({
    event_type: "Fake Door Shown",
    event_properties: { feature, source },
  });

export const trackFakeDoorTapped = (
  feature: FakeDoorFeature,
  source: FakeDoorSource,
) =>
  analytics.track({
    event_type: "Fake Door Tapped",
    event_properties: { feature, source },
  });

/**
 * `interested` rather than a separate "untoggled" event, so the readout can
 * subtract the people who changed their mind from the waiting list without
 * stitching two names together.
 */
export const trackFakeDoorNotifyToggled = (
  feature: FakeDoorFeature,
  interested: boolean,
) =>
  analytics.track({
    event_type: "Fake Door Notify Toggled",
    event_properties: { feature, interested },
  });
