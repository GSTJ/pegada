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
  Share: { share: jest.fn() },
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

import { sendError } from "@/services/error-tracking";

import {
  buildDogShareLinkMessage,
  captureStoryImage,
  copyDogLink,
  getDogShareLink,
  shareDogLink,
  shareDogStory,
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

const fakeRef = (): RefObject<ComponentRef<typeof View> | null> => ({
  current: {} as ComponentRef<typeof View>,
});

// `clearMocks: true` in the jest config (apps/mobile/package.json) already
// resets every mock between tests.
beforeEach(() => {
  pixelRatioGet.mockReturnValue(3);
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
});
