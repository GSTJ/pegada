import { analytics } from "@/services/analytics";

import { trackSharePromptShown, trackSharePromptTapped } from "./tracking";

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
  trackSharePromptShown("empty_deck", "dog-1");

  expect(track).toHaveBeenCalledWith({
    event_type: "Share Prompt Shown",
    event_properties: { placement: "empty_deck", dog_id: "dog-1" },
  });
});

test("names the tapped event and its properties exactly", () => {
  trackSharePromptTapped("first_match", "dog-2");

  expect(track).toHaveBeenCalledWith({
    event_type: "Share Prompt Tapped",
    event_properties: { placement: "first_match", dog_id: "dog-2" },
  });
});
