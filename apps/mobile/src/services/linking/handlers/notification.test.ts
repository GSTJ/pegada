import { router } from "expo-router";

import { analytics } from "@/services/analytics";
import { SceneName } from "@/types/scene-name";

import { customNotificationHandler } from "./notification";

jest.mock<Partial<typeof import("expo-router")>>("expo-router", () => ({
  router: { push: jest.fn() } as unknown as typeof import("expo-router").router,
}));

jest.mock<Partial<typeof import("@/services/error-tracking")>>(
  "@/services/error-tracking",
  () => ({ sendError: jest.fn() }),
);

jest.mock<Partial<typeof import("@/services/analytics")>>(
  "@/services/analytics",
  () => ({ analytics: { track: jest.fn() } as never }),
);

const track = jest.mocked(analytics.track);
const push = jest.mocked(router.push);

test("carries the kind of the scheduled nudge into the open", () => {
  customNotificationHandler("swipe", "new_dogs_nearby");

  expect(track).toHaveBeenCalledWith({
    event_type: "Push Notification Opened",
    event_properties: { kind: "new_dogs_nearby", url: "swipe" },
  });
});

test("reports an open with no kind for a push that carries none", () => {
  customNotificationHandler("match/match-1/dog-1");

  expect(track).toHaveBeenCalledWith({
    event_type: "Push Notification Opened",
    event_properties: { kind: undefined, url: "match/match-1/dog-1" },
  });
});

test("sends the new dogs nudge to the deck", () => {
  customNotificationHandler("swipe", "new_dogs_nearby");

  expect(push).toHaveBeenCalledWith(SceneName.Swipe);
});
