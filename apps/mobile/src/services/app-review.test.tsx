/**
 * `app-review-policy.test.ts` pins the rules. This file pins the wiring around
 * them, which is where the trigger change can go wrong without any rule being
 * wrong: reading the right storage keys, handing the modal the trigger the
 * readout is built on, reporting the users who were blocked, and leaving
 * behind the marker that stops trigger 2 asking a user trigger 1 already
 * asked.
 *
 * Every React Native flavoured import is stubbed, matching the other tests in
 * this package: there is no RN transform here, and nothing below renders.
 */
import * as StoreReview from "expo-store-review";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { magicModal } from "react-native-magic-modal";

import { analytics } from "@/services/analytics";
import { ReviewTrigger } from "@/services/app-review-policy";
import { StorageKeys } from "@/services/storage";

const mockMyDogQuery = jest.fn(() =>
  Promise.resolve({ user: { email: "someone@pegada.app" } }),
);

jest.mock<Record<string, unknown>>("react-native", () => ({
  KeyboardAvoidingView: () => null,
  Platform: { OS: "ios" },
  View: () => null,
}));

jest.mock<Partial<typeof import("expo-store-review")>>(
  "expo-store-review",
  () => ({
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    requestReview: jest.fn(() => Promise.resolve()),
  }),
);

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock<Record<string, unknown>>("react-native-magic-modal", () => ({
  magicModal: { show: jest.fn() },
  useMagicModal: () => ({ hide: jest.fn() }),
}));

jest.mock<Record<string, unknown>>("react-native-magic-toast", () => ({
  magicToast: { success: jest.fn() },
}));

jest.mock<Record<string, unknown>>("react-native-unistyles", () => ({
  StyleSheet: { create: () => ({}) },
  useUnistyles: () => ({ theme: { spacing: {} } }),
  withUnistyles: (component: unknown) => component,
}));

jest.mock<Record<string, unknown>>("@/components/Button", () => ({
  Button: () => null,
}));

jest.mock<Record<string, unknown>>("@/components/Input", () => ({
  Input: () => null,
}));

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: () => null,
}));

jest.mock<Record<string, unknown>>("@/contexts/trcp-context", () => ({
  getTrcpContext: () => ({
    client: { myDog: { get: { query: mockMyDogQuery } } },
  }),
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

// The storage service itself stays real, the way `storage.test.ts` runs it,
// so these tests exercise the key names the shipped build actually reads.
jest.mock<
  Partial<typeof import("@react-native-async-storage/async-storage").default>
>("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock<Partial<typeof import("expo-secure-store")>>(
  "expo-secure-store",
  () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
  }),
);

import {
  handleMessageSentAppReview,
  handleRequestAppReview,
} from "./app-review";

const asyncStorage = jest.mocked(AsyncStorage);
const track = jest.mocked(analytics.track);
const show = jest.mocked(magicModal.show);

/**
 * The trigger the modal was handed. "App Review Request" is sent from the
 * modal's own mount, which nothing here renders, so the assertion that the
 * trigger survives the trip is made on the element instead.
 */
const shownTrigger = () => {
  const render = show.mock.calls[0]?.[0] as
    | (() => { props: { trigger?: string } })
    | undefined;

  return render?.().props.trigger;
};

/** Answers reads per key, so a test only names the keys it cares about. */
const givenStorage = (values: Partial<Record<StorageKeys, string>>) => {
  asyncStorage.getItem.mockImplementation((key) =>
    Promise.resolve(values[key as StorageKeys] ?? null),
  );
};

beforeEach(() => {
  givenStorage({});
  jest.mocked(StoreReview.isAvailableAsync).mockResolvedValue(true);
});

describe("the first match trigger", () => {
  it("asks, names the trigger, and records the ask", async () => {
    await handleRequestAppReview({
      trigger: ReviewTrigger.FirstMatch,
      matchCount: 1,
    });

    expect(show).toHaveBeenCalled();
    expect(shownTrigger()).toBe(ReviewTrigger.FirstMatch);
    // Without this marker the second-message trigger would ask the same user
    // again as soon as the month is up.
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      StorageKeys.AppReviewMatchPrompted,
      "true",
    );
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      StorageKeys.AppReviewRequestDate,
      expect.any(String),
    );
  });

  it("charges the month to a prompt that reached the screen, and nothing else", async () => {
    // The celebration screen hands this in and answers false once a CTA has
    // been pressed, because everything above the modal is asynchronous: three
    // storage reads, the native availability check, and an API round trip.
    // A prompt withdrawn in there used to still write the throttle date,
    // which bought a month of silence for a question nobody was asked, and
    // the match marker, which switched off the second-message fallback too.
    await handleRequestAppReview({
      trigger: ReviewTrigger.FirstMatch,
      matchCount: 1,
      canStillAsk: () => false,
    });

    expect(show).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(asyncStorage.setItem).not.toHaveBeenCalledWith(
      StorageKeys.AppReviewRequestDate,
      expect.any(String),
    );
    expect(asyncStorage.setItem).not.toHaveBeenCalledWith(
      StorageKeys.AppReviewMatchPrompted,
      "true",
    );
  });

  it("shows one prompt when two triggers arrive together", async () => {
    // The celebration timer and a message sent from the chat can overlap by
    // seconds. Both would read the same storage, both would pass the same
    // throttle, and the second modal would land on top of the first.
    await Promise.all([
      handleRequestAppReview({
        trigger: ReviewTrigger.FirstMatch,
        matchCount: 1,
      }),
      handleRequestAppReview({
        trigger: ReviewTrigger.MessagesTab,
        matchCount: 1,
      }),
    ]);

    expect(show).toHaveBeenCalledTimes(1);
  });

  it("stays silent, and unreported, on a later match", async () => {
    await handleRequestAppReview({
      trigger: ReviewTrigger.FirstMatch,
      matchCount: 4,
    });

    expect(show).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
  });

  it("reports the throttle, because that is the number the readout divides by", async () => {
    givenStorage({
      [StorageKeys.AppReviewRequestDate]: new Date().toISOString(),
    });

    await handleRequestAppReview({
      trigger: ReviewTrigger.FirstMatch,
      matchCount: 1,
    });

    expect(show).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith({
      event_type: "App Review Skipped",
      event_properties: {
        trigger: ReviewTrigger.FirstMatch,
        reason: "throttled",
      },
    });
  });

  it("reports a platform with no rating sheet rather than asking anyway", async () => {
    jest.mocked(StoreReview.isAvailableAsync).mockResolvedValue(false);

    await handleRequestAppReview({
      trigger: ReviewTrigger.FirstMatch,
      matchCount: 1,
    });

    expect(show).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith({
      event_type: "App Review Skipped",
      event_properties: {
        trigger: ReviewTrigger.FirstMatch,
        reason: "store_review_unavailable",
      },
    });
  });

  it("never asks a test account, and marks it done so it is never asked again", async () => {
    mockMyDogQuery.mockResolvedValueOnce({ user: { email: "qa@test.com" } });

    await handleRequestAppReview({
      trigger: ReviewTrigger.FirstMatch,
      matchCount: 1,
    });

    expect(show).not.toHaveBeenCalled();
    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      StorageKeys.AppReviewStatus,
      "completed",
    );
  });
});

describe("the second message trigger", () => {
  it("counts the first message without asking", async () => {
    await handleMessageSentAppReview();

    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      StorageKeys.AppReviewSentMessageCount,
      "1",
    );
    expect(show).not.toHaveBeenCalled();
  });

  it("asks on the second, for a user the match prompt never reached", async () => {
    givenStorage({ [StorageKeys.AppReviewSentMessageCount]: "1" });

    await handleMessageSentAppReview();

    expect(show).toHaveBeenCalled();
    expect(shownTrigger()).toBe(ReviewTrigger.SecondMessage);
  });

  it("holds its peace when the match prompt already landed", async () => {
    givenStorage({
      [StorageKeys.AppReviewSentMessageCount]: "1",
      [StorageKeys.AppReviewMatchPrompted]: "true",
    });

    await handleMessageSentAppReview();

    expect(show).not.toHaveBeenCalled();
  });

  it("stops touching storage once it is past the message it waits for", async () => {
    givenStorage({ [StorageKeys.AppReviewSentMessageCount]: "2" });

    await handleMessageSentAppReview();

    // Every message a chatty user sends would otherwise be a write and a
    // native store-availability call for a question already answered.
    expect(asyncStorage.setItem).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
  });

  it("treats an unreadable counter as no messages yet", async () => {
    givenStorage({ [StorageKeys.AppReviewSentMessageCount]: "not-a-number" });

    await handleMessageSentAppReview();

    expect(asyncStorage.setItem).toHaveBeenCalledWith(
      StorageKeys.AppReviewSentMessageCount,
      "1",
    );
  });
});
