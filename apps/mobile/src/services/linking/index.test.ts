import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { router } from "expo-router";

jest.mock<Partial<typeof import("expo-router")>>("expo-router", () => ({
  router: { push: jest.fn() } as unknown as typeof import("expo-router").router,
}));

// The module under test also wires up notification handling
// (useGetInitialNotifications / processLinks), which pulls in
// expo-notifications and the observability stack at import time. The stub
// keeps the import side-effect-free the way action.test.ts mocks
// error-tracking, and doubles as the tap simulator the replay tests drive:
// it hands back the registered listeners so a tap can be delivered to every
// one of them, exactly as the native module does.
jest.mock<Record<string, unknown>>("expo-notifications", () => ({
  addNotificationResponseReceivedListener: (
    listener: (response: unknown) => void,
  ) => {
    mockResponseListeners.add(listener);
    return {
      remove: () => {
        mockResponseListeners.delete(listener);
      },
    };
  },
  getLastNotificationResponseAsync: () =>
    Promise.resolve(mockLastNotificationResponse),
}));

const mockResponseListeners = new Set<(response: unknown) => void>();
let mockLastNotificationResponse: unknown = null;

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

import {
  processLinks,
  useGetInitialNotifications,
  usePendingDogProfile,
} from ".";
import { setInitialNotification } from "./handlers/initial-notification";

const push = jest.mocked(router.push);
const track = jest.mocked(analytics.track);

const Harness = ({ enabled }: { enabled: boolean }) => {
  usePendingDogProfile(enabled);
  return null;
};

const render = (enabled: boolean) =>
  renderToStaticMarkup(React.createElement(Harness, { enabled }));

const notificationResponse = (identifier: string, url: string) => ({
  notification: { request: { identifier, content: { data: { url } } } },
});

/** Mounts the root layout, which is where the app wide tap listener lives. */
const mountLayout = async () => {
  const LayoutHarness = () => {
    useGetInitialNotifications();
    return null;
  };

  renderToStaticMarkup(React.createElement(LayoutHarness));
  // getLastNotificationResponseAsync resolves on a microtask, and the cold
  // start tap is only stored once it does.
  await Promise.resolve();
  await Promise.resolve();
};

/** Delivers a tap to every registered listener, the way the OS does. */
const tap = (response: ReturnType<typeof notificationResponse>) => {
  for (const listener of mockResponseListeners) listener(response);
};

const countReported = (eventType: string) =>
  track.mock.calls.filter(([event]) => event.event_type === eventType).length;

afterEach(() => {
  mockPendingDogProfileId = undefined;
  mockResponseListeners.clear();
  mockLastNotificationResponse = null;
  setInitialNotification(undefined);
  track.mockClear();
  push.mockClear();
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

test("reports a cold start tap once, and not again when Swipe remounts", async () => {
  mockLastNotificationResponse = notificationResponse("cold-1", "swipe");
  await mountLayout();

  const firstMount = processLinks();

  expect(countReported("Push Notification Opened")).toBe(1);
  expect(countReported("Deep Link Opened")).toBe(1);
  expect(push).toHaveBeenCalledTimes(1);

  firstMount.remove();
  processLinks().remove();

  expect(countReported("Push Notification Opened")).toBe(1);
  expect(countReported("Deep Link Opened")).toBe(1);
  expect(push).toHaveBeenCalledTimes(1);
});

test("reports a tap taken while the app is open once, and not again when Swipe remounts", async () => {
  await mountLayout();
  const firstMount = processLinks();

  tap(notificationResponse("warm-1", "swipe"));

  expect(countReported("Push Notification Opened")).toBe(1);
  expect(countReported("Deep Link Opened")).toBe(1);
  expect(push).toHaveBeenCalledTimes(1);

  firstMount.remove();
  processLinks().remove();

  expect(countReported("Push Notification Opened")).toBe(1);
  expect(countReported("Deep Link Opened")).toBe(1);
  expect(push).toHaveBeenCalledTimes(1);
});

test("handles a tap taken while Swipe is unmounted on the next mount, once", async () => {
  await mountLayout();
  processLinks().remove();

  tap(notificationResponse("warm-2", "swipe"));

  expect(countReported("Push Notification Opened")).toBe(0);

  processLinks().remove();

  expect(countReported("Push Notification Opened")).toBe(1);
  expect(push).toHaveBeenCalledTimes(1);

  processLinks().remove();

  expect(countReported("Push Notification Opened")).toBe(1);
  expect(push).toHaveBeenCalledTimes(1);
});

test("reports nothing when Swipe mounts with no tap waiting", async () => {
  await mountLayout();

  processLinks().remove();
  processLinks().remove();

  expect(countReported("Push Notification Opened")).toBe(0);
  expect(push).not.toHaveBeenCalled();
});
