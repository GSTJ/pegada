import { analytics } from "@/services/analytics";

import {
  trackFakeDoorNotifyToggled,
  trackFakeDoorShown,
  trackFakeDoorTapped,
} from "./tracking";

jest.mock<Partial<typeof import("@/services/analytics")>>(
  "@/services/analytics",
  () => ({
    analytics: {
      track: jest.fn(),
      screenViewed: jest.fn(),
      identify: jest.fn(),
      setPersonProperties: jest.fn(),
      reset: jest.fn(),
    },
  }),
);

const track = jest.mocked(analytics.track);

/**
 * The event names and property keys are the funnel's only contract with
 * PostHog. Renaming one breaks a dashboard silently, so they are spelled out
 * here rather than derived.
 */
test("names the shown event and its properties exactly", () => {
  trackFakeDoorShown("referral_reward", "share_sheet");

  expect(track).toHaveBeenCalledWith({
    event_type: "Fake Door Shown",
    event_properties: { feature: "referral_reward", source: "share_sheet" },
  });
});

test("names the tapped event and its properties exactly", () => {
  trackFakeDoorTapped("ai_story_video", "share_sheet");

  expect(track).toHaveBeenCalledWith({
    event_type: "Fake Door Tapped",
    event_properties: { feature: "ai_story_video", source: "share_sheet" },
  });
});

test("names the notify toggled event and its properties exactly", () => {
  trackFakeDoorNotifyToggled("referral_reward", true);

  expect(track).toHaveBeenCalledWith({
    event_type: "Fake Door Notify Toggled",
    event_properties: { feature: "referral_reward", interested: true },
  });
});

test("carries the untoggled case on the same event", () => {
  trackFakeDoorNotifyToggled("ai_story_video", false);

  expect(track).toHaveBeenCalledWith({
    event_type: "Fake Door Notify Toggled",
    event_properties: { feature: "ai_story_video", interested: false },
  });
});
