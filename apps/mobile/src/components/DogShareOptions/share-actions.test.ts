import type { ComponentRef, RefObject } from "react";
import type { View } from "react-native";

/**
 * `DogShareSheetContent` (index.tsx) pulls in `useSafeAreaInsets`,
 * `useWindowDimensions`, `useMagicModal`, `useTranslation` and the
 * offscreen `DogStoryCard` — none of which the actual share/copy/capture
 * logic depends on. That logic lives in `share-actions.ts` instead, so it
 * can be exercised here under plain jest (this suite has no RN preset —
 * see `RadioButtons/index.test.tsx` for the same constraint) by mocking
 * only the handful of `react-native` + `expo-*` + `react-native-magic-*`
 * calls it actually makes, rather than mounting the whole sheet.
 */

jest.mock<Record<string, unknown>>("react-native", () => ({
  Alert: { alert: jest.fn() },
  PixelRatio: { get: jest.fn(() => 3) },
  Share: { share: jest.fn(), dismissedAction: "dismissedAction" },
}));

jest.mock<Record<string, unknown>>("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
}));

jest.mock<Record<string, unknown>>("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock<Record<string, unknown>>("react-native-magic-toast", () => ({
  magicToast: { success: jest.fn(), alert: jest.fn() },
}));

jest.mock<Record<string, unknown>>("react-native-view-shot", () => ({
  captureRef: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

// `@/constants` reads `Dimensions.get("screen")` at module load — mocked
// wholesale rather than added to the `react-native` mock above so this
// suite does not have to also stub `Dimensions` just to satisfy an import
// chain unrelated to what is under test.
jest.mock<Record<string, unknown>>("@/constants", () => ({
  APP_SHARE_LINK_BASE: "https://www.pegada.app",
}));

// Owned by another change in flight on this branch (story-card-styles.ts) —
// mocked so this suite pins the two constants it actually depends on
// instead of coupling to that file's `StyleSheet.create` call succeeding
// under jest.
jest.mock<Record<string, unknown>>("./story-card-styles", () => ({
  EXPORT_PNG_WIDTH: 1080,
  EXPORT_PNG_HEIGHT: 1920,
}));

import { Alert, PixelRatio, Share } from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";

import { magicToast } from "react-native-magic-toast";
import { captureRef } from "react-native-view-shot";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";

import {
  buildDogShareLinkMessage,
  captureStoryImage,
  copyDogLink,
  getDogShareLink,
  shareDogLink,
  shareDogStory,
  trackDogShareCompleted,
  trackDogShareTapped,
  type ShareTracking,
} from "./share-actions";

const share = jest.mocked(Share.share);
const alert = jest.mocked(Alert.alert);
const pixelRatioGet = jest.mocked(PixelRatio.get);
const setStringAsync = jest.mocked(Clipboard.setStringAsync);
const isAvailableAsync = jest.mocked(Sharing.isAvailableAsync);
const shareAsync = jest.mocked(Sharing.shareAsync);
const toastSuccess = jest.mocked(magicToast.success);
const toastAlert = jest.mocked(magicToast.alert);
const capture = jest.mocked(captureRef);
const trackedError = jest.mocked(sendError);
const track = jest.mocked(analytics.track);

const fakeRef = (): RefObject<ComponentRef<typeof View> | null> => ({
  current: {} as ComponentRef<typeof View>,
});

const tracking: ShareTracking = {
  source: "own_profile",
  dogId: "dog-1",
  option: "link",
};

/** The exact `Share Completed` payload a given result should produce, so a
 * test asserts on the whole event rather than a subset that would still pass
 * if `dog_id`, `is_own_dog` or `source` silently went missing. */
const shareEvent = (
  result: string,
  overrides: Partial<{
    dog_id: string;
    fallback: boolean;
    is_own_dog: boolean;
    option: string | null;
    source: string;
  }> = {},
) => ({
  event_type: "Share Completed",
  event_properties: {
    dog_id: "dog-1",
    fallback: false,
    is_own_dog: true,
    option: "link",
    result,
    source: "own_profile",
    ...overrides,
  },
});

// `clearMocks: true` in the jest config (apps/mobile/package.json) already
// resets every mock between tests.
beforeEach(() => {
  pixelRatioGet.mockReturnValue(3);
});

describe("share funnel events", () => {
  it("opens the funnel with Share Tapped and nothing else", () => {
    trackDogShareTapped({ source: "own_profile", dogId: "dog-1" });

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith({
      event_type: "Share Tapped",
      event_properties: {
        dog_id: "dog-1",
        is_own_dog: true,
        source: "own_profile",
      },
    });
  });

  it("keeps the entry point as its own property alongside is_own_dog", () => {
    trackDogShareTapped({ source: "dog_profile", dogId: "dog-2" });

    expect(track).toHaveBeenCalledWith({
      event_type: "Share Tapped",
      event_properties: {
        dog_id: "dog-2",
        is_own_dog: false,
        source: "dog_profile",
      },
    });
  });

  it("counts a share prompt placement as the user's own dog", () => {
    trackDogShareTapped({ source: "empty_deck", dogId: "dog-3" });

    expect(track).toHaveBeenCalledWith({
      event_type: "Share Tapped",
      event_properties: {
        dog_id: "dog-3",
        is_own_dog: true,
        source: "empty_deck",
      },
    });
  });

  it("closes the funnel with a null option when no row was picked", () => {
    trackDogShareCompleted("dismissed", {
      source: "dog_profile",
      dogId: "dog-2",
    });

    expect(track).toHaveBeenCalledWith({
      event_type: "Share Completed",
      event_properties: {
        dog_id: "dog-2",
        fallback: false,
        is_own_dog: false,
        option: null,
        result: "dismissed",
        source: "dog_profile",
      },
    });
  });
});

describe("getDogShareLink", () => {
  it("builds the public dog URL from the app's share link base", () => {
    expect(getDogShareLink("abc123")).toBe("https://www.pegada.app/dog/abc123");
  });
});

describe("buildDogShareLinkMessage", () => {
  it("asks i18next for dogProfile.shareLink with the right link", () => {
    const t = jest.fn(() => "translated");

    const message = buildDogShareLinkMessage(
      t as never,
      "https://www.pegada.app/dog/abc123",
    );

    expect(t).toHaveBeenCalledWith("dogProfile.shareLink", {
      link: "https://www.pegada.app/dog/abc123",
    });
    expect(message).toBe("translated");
  });
});

describe("captureStoryImage", () => {
  it("captures at exactly 1080x1920 pixels on a 3x device", async () => {
    pixelRatioGet.mockReturnValue(3);
    capture.mockResolvedValue("file:///tmp/story.png");

    await captureStoryImage(fakeRef());

    expect(capture).toHaveBeenCalledWith(expect.anything(), {
      width: 360, // 1080 / 3
      height: 640, // 1920 / 3
      format: "png",
      quality: 1,
      result: "tmpfile",
    });
  });

  it("divides by whatever PixelRatio.get() reports, not a hardcoded scale", async () => {
    pixelRatioGet.mockReturnValue(2);
    capture.mockResolvedValue("file:///tmp/story.png");

    await captureStoryImage(fakeRef());

    expect(capture).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 540, height: 960 }),
    );
  });
});

describe("copyDogLink", () => {
  const copy = { success: "Link copied!", failure: "Couldn't copy" };

  it("copies the link and shows the success toast", async () => {
    setStringAsync.mockResolvedValue(true);

    await copyDogLink("https://www.pegada.app/dog/abc", copy);

    expect(setStringAsync).toHaveBeenCalledWith(
      "https://www.pegada.app/dog/abc",
    );
    expect(toastSuccess).toHaveBeenCalledWith("Link copied!", 1500);
    expect(toastAlert).not.toHaveBeenCalled();
  });

  it("reports the error and shows the failure toast when the write rejects", async () => {
    const error = new Error("clipboard unavailable");
    setStringAsync.mockRejectedValue(error);

    await copyDogLink("https://www.pegada.app/dog/abc", copy);

    expect(trackedError).toHaveBeenCalledWith(error);
    expect(toastAlert).toHaveBeenCalledWith("Couldn't copy");
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("tracks a success and an error against the copy_link option", async () => {
    const copyTracking: ShareTracking = { ...tracking, option: "copy_link" };
    setStringAsync.mockResolvedValue(true);

    await copyDogLink("https://www.pegada.app/dog/abc", copy, copyTracking);

    expect(track).toHaveBeenCalledWith(
      shareEvent("shared", { option: "copy_link" }),
    );

    track.mockClear();
    setStringAsync.mockRejectedValue(new Error("clipboard unavailable"));

    await copyDogLink("https://www.pegada.app/dog/abc", copy, copyTracking);

    expect(track).toHaveBeenCalledWith(
      shareEvent("error", { option: "copy_link" }),
    );
  });

  it("skips analytics entirely when no tracking context is passed", async () => {
    setStringAsync.mockResolvedValue(true);

    await copyDogLink("https://www.pegada.app/dog/abc", copy);

    expect(track).not.toHaveBeenCalled();
  });
});

describe("shareDogLink", () => {
  const unavailableCopy = { title: "Oops", message: "Try again later" };

  it("shares the message through the native share sheet", async () => {
    share.mockResolvedValue({ action: "sharedAction" });

    await shareDogLink("check out Rex", unavailableCopy);

    expect(share).toHaveBeenCalledWith({ message: "check out Rex" });
    expect(alert).not.toHaveBeenCalled();
  });

  it("reports the error and alerts when Share.share rejects", async () => {
    const error = new Error("no share targets");
    share.mockRejectedValue(error);

    await shareDogLink("check out Rex", unavailableCopy);

    expect(trackedError).toHaveBeenCalledWith(error);
    expect(alert).toHaveBeenCalledWith("Oops", "Try again later");
  });

  it("tracks a shared result when the user goes through with the native sheet", async () => {
    share.mockResolvedValue({ action: "sharedAction" });

    await shareDogLink("check out Rex", unavailableCopy, tracking);

    expect(track).toHaveBeenCalledWith(shareEvent("shared"));
  });

  it("tracks a dismissed result when the native sheet is dismissed", async () => {
    share.mockResolvedValue({ action: "dismissedAction" });

    await shareDogLink("check out Rex", unavailableCopy, tracking);

    expect(track).toHaveBeenCalledWith(shareEvent("dismissed"));
  });

  it("tracks an error when Share.share rejects", async () => {
    share.mockRejectedValue(new Error("no share targets"));

    await shareDogLink("check out Rex", unavailableCopy, tracking);

    expect(track).toHaveBeenCalledWith(shareEvent("error"));
  });
});

describe("shareDogStory", () => {
  const baseParams = () => ({
    storyCardRef: fakeRef(),
    waitForPhoto: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    hide: jest.fn(),
    dialogTitle: "Share Rex's profile",
    shareLinkMessage: "check out Rex",
    copy: {
      storyUnavailable: "Image sharing isn't available",
      storyFailedFallback: "Couldn't create the story image",
      sharingNotAvailable: { title: "Oops", message: "Try again later" },
    },
  });

  it("captures the card and hands it to the native share sheet", async () => {
    isAvailableAsync.mockResolvedValue(true);
    capture.mockResolvedValue("file:///tmp/story.png");
    shareAsync.mockResolvedValue();
    const params = baseParams();

    await shareDogStory(params);

    expect(params.waitForPhoto).toHaveBeenCalled();
    expect(capture).toHaveBeenCalled();
    expect(params.hide).toHaveBeenCalledTimes(1);
    expect(shareAsync).toHaveBeenCalledWith("file:///tmp/story.png", {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle: "Share Rex's profile",
    });
    expect(share).not.toHaveBeenCalled();
  });

  it("falls back to the link share when Sharing.isAvailableAsync resolves false", async () => {
    isAvailableAsync.mockResolvedValue(false);
    share.mockResolvedValue({ action: "sharedAction" });
    const params = baseParams();

    await shareDogStory(params);

    expect(toastAlert).toHaveBeenCalledWith("Image sharing isn't available");
    expect(params.hide).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ message: "check out Rex" });
    expect(capture).not.toHaveBeenCalled();
  });

  it("falls back to the link share and reports the error when Sharing.isAvailableAsync rejects", async () => {
    const error = new Error("sharing module unavailable");
    isAvailableAsync.mockRejectedValue(error);
    share.mockResolvedValue({ action: "sharedAction" });
    const params = baseParams();

    await shareDogStory(params);

    expect(trackedError).toHaveBeenCalledWith(error);
    expect(toastAlert).toHaveBeenCalledWith("Image sharing isn't available");
    expect(params.hide).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ message: "check out Rex" });
    expect(capture).not.toHaveBeenCalled();
  });

  it("falls back to the link share and reports the error when captureRef rejects", async () => {
    isAvailableAsync.mockResolvedValue(true);
    const error = new Error("capture failed");
    capture.mockRejectedValue(error);
    share.mockResolvedValue({ action: "sharedAction" });
    const params = baseParams();

    await shareDogStory(params);

    expect(trackedError).toHaveBeenCalledWith(error);
    expect(toastAlert).toHaveBeenCalledWith("Couldn't create the story image");
    expect(params.hide).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ message: "check out Rex" });
    expect(shareAsync).not.toHaveBeenCalled();
  });

  it("bails out quietly when the sheet is dismissed while waiting for the photo", async () => {
    isAvailableAsync.mockResolvedValue(true);
    const params = {
      ...baseParams(),
      // The sheet's offscreen card goes with it, so the ref is empty by the
      // time the wait resolves — the exact state a swipe-down leaves behind.
      storyCardRef: { current: null },
      isCancelled: () => true,
    };

    await shareDogStory(params);

    expect(capture).not.toHaveBeenCalled();
    expect(share).not.toHaveBeenCalled();
    expect(trackedError).not.toHaveBeenCalled();
    expect(toastAlert).not.toHaveBeenCalled();
    expect(params.hide).not.toHaveBeenCalled();
  });

  it("tracks the dismissal as dismissed rather than an error", async () => {
    isAvailableAsync.mockResolvedValue(true);

    await shareDogStory({
      ...baseParams(),
      isCancelled: () => true,
      tracking: { ...tracking, option: "story" },
    });

    expect(track).toHaveBeenCalledWith(
      shareEvent("dismissed", { option: "story" }),
    );
  });

  it("still shares when isCancelled stays false", async () => {
    isAvailableAsync.mockResolvedValue(true);
    capture.mockResolvedValue("file:///tmp/story.png");
    shareAsync.mockResolvedValue();

    await shareDogStory({ ...baseParams(), isCancelled: () => false });

    expect(shareAsync).toHaveBeenCalled();
  });

  it("tracks a story share when shareAsync resolves", async () => {
    isAvailableAsync.mockResolvedValue(true);
    capture.mockResolvedValue("file:///tmp/story.png");
    shareAsync.mockResolvedValue();

    await shareDogStory({
      ...baseParams(),
      tracking: { ...tracking, option: "story" },
    });

    expect(track).toHaveBeenCalledWith(
      shareEvent("shared", { option: "story" }),
    );
  });

  it("flags the fallback link share so it is not read as a story share", async () => {
    isAvailableAsync.mockResolvedValue(false);
    share.mockResolvedValue({ action: "sharedAction" });

    await shareDogStory({
      ...baseParams(),
      tracking: { ...tracking, option: "story" },
    });

    expect(track).toHaveBeenCalledWith(
      shareEvent("shared", { option: "story", fallback: true }),
    );
    expect(track).not.toHaveBeenCalledWith(
      shareEvent("shared", { option: "story" }),
    );
  });
});
