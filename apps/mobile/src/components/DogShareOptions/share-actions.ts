import type { TFunction } from "i18next";

import type { ComponentRef, RefObject } from "react";

import { Alert, PixelRatio, Share, type View } from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";

import { magicToast } from "react-native-magic-toast";
import { captureRef } from "react-native-view-shot";

import { APP_SHARE_LINK_BASE } from "@/constants";
import { sendError } from "@/services/error-tracking";

import { EXPORT_PNG_HEIGHT, EXPORT_PNG_WIDTH } from "./story-card-styles";

/**
 * The side-effecting handlers `DogShareSheetContent` wires to its three
 * rows, pulled out of the component so they can run under plain jest
 * (mocking `react-native`, `expo-*` and the magic-* libraries) rather than
 * needing the component rendered — this component pulls in
 * `useSafeAreaInsets`, `useWindowDimensions`, `useMagicModal`,
 * `useTranslation` and the offscreen `DogStoryCard`, none of which this
 * logic actually depends on. `index.tsx` stays a thin wrapper: it resolves
 * copy through `t()` and refs through component state, then calls
 * straight through to these.
 */

export const getDogShareLink = (dogId: string) =>
  `${APP_SHARE_LINK_BASE}/dog/${dogId}`;

/** `t("dogProfile.shareLink", { link })`, pulled out so a test can assert
 * the exact key and link it is called with without mounting the sheet. */
export const buildDogShareLinkMessage = (t: TFunction, link: string) =>
  t("dogProfile.shareLink", { link });

/**
 * Shares `message` through the native share sheet. This is both the
 * "Share link" row's own action and the fallback every other row drops
 * back to when its own path fails (story capture rejects, or
 * `Sharing.isAvailableAsync` says the device can't share files) — the one
 * thing every path can always fall back to, since `Share.share` has none
 * of `Sharing.shareAsync`'s device-capability precondition.
 */
export const shareDogLink = async (
  message: string,
  unavailableCopy: { title: string; message: string },
) => {
  try {
    await Share.share({ message });
  } catch (error) {
    sendError(error);
    Alert.alert(unavailableCopy.title, unavailableCopy.message);
  }
};

/** Copies `link` to the clipboard and reports success/failure via
 * `magicToast`. `duration` matches the sheet's own 1500ms success toast. */
export const copyDogLink = async (
  link: string,
  copy: { success: string; failure: string },
) => {
  try {
    await Clipboard.setStringAsync(link);
    magicToast.success(copy.success, 1500);
  } catch (error) {
    sendError(error);
    magicToast.alert(copy.failure);
  }
};

/**
 * Captures the offscreen `DogStoryCard` at `ref` as a PNG at exactly
 * `EXPORT_PNG_WIDTH` x `EXPORT_PNG_HEIGHT` pixels, on any device.
 *
 * `captureRef`'s `width`/`height` options are in POINTS, and iOS
 * multiplies them by the device's pixel ratio when it rasterizes —
 * asking for the pixel size directly would produce an image
 * `PixelRatio.get()` times too large (3240x5760 at 12.7 MB on a 3x
 * device instead of the intended 1080x1920). Dividing by the ratio here
 * lands on the exact pixel size regardless of device.
 */
export const captureStoryImage = (
  ref: RefObject<ComponentRef<typeof View> | null>,
) => {
  const scale = PixelRatio.get();

  return captureRef(ref, {
    width: EXPORT_PNG_WIDTH / scale,
    height: EXPORT_PNG_HEIGHT / scale,
    format: "png",
    quality: 1,
    result: "tmpfile",
  });
};

export type ShareDogStoryCopy = {
  storyUnavailable: string;
  storyFailedFallback: string;
  sharingNotAvailable: { title: string; message: string };
};

/**
 * Orchestrates the "Share to story" row: capture the offscreen card, hand
 * it to the native share sheet, and fall back to sharing the plain link
 * (`shareDogLink`) whenever image sharing isn't possible — the device
 * can't share files at all, the photo never finished loading in time, the
 * capture failed, or the ref was never mounted.
 *
 * Mirrors `handleShareStory`'s original control flow exactly: the
 * `Sharing.isAvailableAsync` check short-circuits BEFORE the try block (it
 * is a normal early return, not a thrown error), while a missing ref is a
 * thrown error INSIDE the try block, so it takes the same catch path as a
 * rejected capture or a rejected `Sharing.shareAsync` call.
 */
export const shareDogStory = async (params: {
  storyCardRef: RefObject<ComponentRef<typeof View> | null>;
  waitForPhoto: () => Promise<void>;
  hide: () => void;
  dialogTitle: string;
  shareLinkMessage: string;
  copy: ShareDogStoryCopy;
}) => {
  const {
    storyCardRef,
    waitForPhoto,
    hide,
    dialogTitle,
    shareLinkMessage,
    copy,
  } = params;

  const available = await Sharing.isAvailableAsync();

  if (!available) {
    magicToast.alert(copy.storyUnavailable);
    hide();
    await shareDogLink(shareLinkMessage, copy.sharingNotAvailable);
    return;
  }

  try {
    await waitForPhoto();

    if (!storyCardRef.current) {
      throw new Error("Story card was not mounted for capture");
    }

    const uri = await captureStoryImage(storyCardRef);
    const fileUri = uri.startsWith("file://") ? uri : `file://${uri}`;

    hide();

    await Sharing.shareAsync(fileUri, {
      mimeType: "image/png",
      UTI: "public.png",
      dialogTitle,
    });
  } catch (error) {
    sendError(error);
    magicToast.alert(copy.storyFailedFallback);
    hide();
    await shareDogLink(shareLinkMessage, copy.sharingNotAvailable);
  }
};
