import type * as Notifications from "expo-notifications";

/**
 * Stands in for the device's storage, so it survives the module reset that
 * stands in for closing and reopening the app.
 */
const mockStoredValues = new Map<string, string>();

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

jest.mock<Partial<typeof import("@/services/storage")>>(
  "@/services/storage",
  () => ({
    StorageKeys: {
      LastOpenedNotificationId: "lastOpenedNotificationId",
    } as never,
    getData: jest.fn((key: string) =>
      Promise.resolve(mockStoredValues.get(key) ?? null),
    ) as never,
    storeData: jest.fn((key: string, value: string) => {
      mockStoredValues.set(key, value);
      return Promise.resolve(value);
    }) as never,
  }),
);

/**
 * A fresh launch: the module's in-memory guard is gone, the stored identifier
 * is not.
 */
const launchApp = () => {
  jest.resetModules();

  const handlers = require("./notification") as typeof import("./notification");
  const { analytics } = require("@/services/analytics") as {
    analytics: { track: jest.Mock };
  };

  return { ...handlers, track: analytics.track };
};

const notificationResponse = (identifier: string, kind?: string) =>
  ({
    notification: {
      request: {
        identifier,
        content: { data: { url: "swipe", kind } },
      },
    },
  }) as unknown as Notifications.NotificationResponse;

/** The report is fire and forget, so let its promise chain drain. */
const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

beforeEach(() => {
  mockStoredValues.clear();
});

test("reports an open with the kind the server sent", async () => {
  const { trackNotificationOpened, track } = launchApp();

  trackNotificationOpened(notificationResponse("abc", "new_dogs_nearby"));
  await flush();

  expect(track).toHaveBeenCalledTimes(1);
  expect(track).toHaveBeenCalledWith({
    event_type: "push_notification_opened",
    event_properties: { kind: "new_dogs_nearby" },
  });
});

test("reports an open with no kind for a notification that carries none", async () => {
  const { trackNotificationOpened, track } = launchApp();

  trackNotificationOpened(notificationResponse("abc"));
  await flush();

  expect(track).toHaveBeenCalledWith({
    event_type: "push_notification_opened",
    event_properties: { kind: undefined },
  });
});

test("counts one tap once even though two listeners see it", async () => {
  const { trackNotificationOpened, track } = launchApp();

  const response = notificationResponse("abc", "likes_waiting");
  trackNotificationOpened(response);
  trackNotificationOpened(response);
  await flush();

  expect(track).toHaveBeenCalledTimes(1);
});

test("does not count the same notification again on the next launch", async () => {
  const first = launchApp();

  first.trackNotificationOpened(
    notificationResponse("abc", "unanswered_match"),
  );
  await flush();

  expect(first.track).toHaveBeenCalledTimes(1);

  // `getLastNotificationResponseAsync` hands back the same response on every
  // cold start until a newer notification arrives, so this is the launch that
  // used to double count.
  const second = launchApp();

  second.trackNotificationOpened(
    notificationResponse("abc", "unanswered_match"),
  );
  await flush();

  expect(second.track).not.toHaveBeenCalled();
});

test("counts a different notification on a later launch", async () => {
  const first = launchApp();

  first.trackNotificationOpened(notificationResponse("abc", "likes_waiting"));
  await flush();

  const second = launchApp();

  second.trackNotificationOpened(notificationResponse("xyz", "likes_waiting"));
  await flush();

  expect(second.track).toHaveBeenCalledTimes(1);
});
