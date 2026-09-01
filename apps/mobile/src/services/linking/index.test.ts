import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { router } from "expo-router";

jest.mock<Partial<typeof import("expo-router")>>("expo-router", () => ({
  router: { push: jest.fn() } as unknown as typeof import("expo-router").router,
}));

// The module under test also wires up notification handling
// (useGetInitialNotifications / processLinks), which pulls in
// expo-notifications and the observability stack at import time. Neither
// runs in this test — only usePendingDogProfile does — so both are stubbed
// to keep the import side-effect-free, the same way action.test.ts mocks
// error-tracking for the same reason.
jest.mock<Record<string, unknown>>("expo-notifications", () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

// pending-dog-profile.test.ts already covers that store and its hook in
// isolation. Here the pending id is only an input to usePendingDogProfile,
// so it is driven directly through this mock: `renderToStaticMarkup` has no
// commit phase, so a real subscription would never notify between renders
// and the "id changed while already enabled" case could not be expressed.
let mockPendingDogProfileId: string | undefined;

jest.mock<Record<string, unknown>>("./handlers/pending-dog-profile", () => ({
  usePendingDogProfileId: () => mockPendingDogProfileId,
  setPendingDogProfile: (id?: string) => {
    mockPendingDogProfileId = id;
  },
}));

// `usePendingDogProfile`'s push/clear logic lives inside a plain `useEffect`,
// and `renderToStaticMarkup` has no commit phase — real `useEffect` never
// fires under it. Running the callback inline mirrors how this package's
// other tests stub effect-shaped hooks for the same reason (see NewMatch's
// `useFocusEffect` stub): a static render already stands in for "the effect
// ran".
jest.mock<Record<string, unknown>>("react", () => {
  const actual = jest.requireActual("react") as typeof React;
  return {
    ...actual,
    useEffect: (effect: () => void) => effect(),
  };
});

import { analytics } from "@/services/analytics";

import { usePendingDogProfile } from ".";

const push = jest.mocked(router.push);
const track = jest.mocked(analytics.track);

const Harness = ({ enabled }: { enabled: boolean }) => {
  usePendingDogProfile(enabled);
  return null;
};

const render = (enabled: boolean) =>
  renderToStaticMarkup(React.createElement(Harness, { enabled }));

afterEach(() => {
  mockPendingDogProfileId = undefined;
  track.mockClear();
});

test("does not navigate while disabled, even with a pending id", () => {
  mockPendingDogProfileId = "dog-1";

  render(false);

  expect(push).not.toHaveBeenCalled();
  // Never enabled, so the pending id is left untouched for whenever it is.
  expect(mockPendingDogProfileId).toBe("dog-1");
});

test("pushes the profile once enabled becomes true, and clears the pending id", () => {
  mockPendingDogProfileId = "dog-1";
  render(false);

  render(true);

  expect(push).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith({
    pathname: "/profile/[id]",
    params: { id: "dog-1" },
  });
  expect(mockPendingDogProfileId).toBeUndefined();
});

test("does not push again on a re-render with nothing new pending", () => {
  mockPendingDogProfileId = "dog-1";
  render(true);
  push.mockClear();

  render(true);

  expect(push).not.toHaveBeenCalled();
});

test("tracks the profile as reached, once, only when it actually pushes", () => {
  mockPendingDogProfileId = "dog-1";

  render(false);
  expect(track).not.toHaveBeenCalled();

  render(true);

  expect(track).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledWith({
    event_type: "Dog Link Profile Opened",
  });
});

test("pushes again for a second id that arrives while already enabled", () => {
  mockPendingDogProfileId = "dog-1";
  render(true);
  push.mockClear();

  mockPendingDogProfileId = "dog-2";
  render(true);

  expect(push).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith({
    pathname: "/profile/[id]",
    params: { id: "dog-2" },
  });
});
