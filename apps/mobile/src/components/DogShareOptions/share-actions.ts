import type { TFunction } from "i18next";

import type { ComponentRef, RefObject } from "react";

import { Alert, PixelRatio, Share, type View } from "react-native";

import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";

import { magicToast } from "react-native-magic-toast";
import { captureRef } from "react-native-view-shot";

import { APP_SHARE_LINK_BASE } from "@/constants";
import { analytics } from "@/services/analytics";
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

/** Which screen the sheet was opened from, so the two entry points can be
 * compared without splitting the funnel across two event names. */
export type ShareSource = "own_profile" | "dog_profile";

/** Which row of the sheet the user picked. `null` on the sheet-level
 * events (opened, dismissed) where no row has been chosen yet. */
export type ShareOption = "link" | "copy_link" | "story";

export type ShareTracking = {
  source: ShareSource;
  dogId: string;
  option: ShareOption;
  /** True when this link share is the story row's fallback rather than the
   * "Share link" row, so the readout can tell a deliberate link share from
   * a story that could not be produced. */
  fallback?: boolean;
};

/**
 * Every share funnel event goes out under one `Dog Share` name with a
 * `type` stage property, matching how `Upgrade` is instrumented in
 * `views/UpgradeWall`. One event name keeps the whole funnel (open,
 * select, success, cancel, error) readable as a single PostHog insight
 * broken down by `type` and `option` instead of five separate events that
 * have to be stitched together.
 */
export const trackDogShare = (
  stage: "open" | "select" | "success" | "cancel" | "error",
  tracking: Omit<ShareTracking, "option"> & { option?: ShareOption },
) =>
  analytics.track({
    event_type: "Dog Share",
    event_properties: {
      type: stage,
      source: tracking.source,
      dog_id: tracking.dogId,
      option: tracking.option ?? null,
      fallback: Boolean(tracking.fallback),
    },
  });

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
 *
 * `Share.share` resolves with `dismissedAction` when the user backs out of
 * the native sheet, which is the only cancel signal any of the three rows
 * gets, so it is tracked as `type: "cancel"` rather than a success.
 */
export const shareDogLink = async (
  message: string,
  unavailableCopy: { title: string; message: string },
  tracking?: ShareTracking,
) => {
  try {
    const result = await Share.share({ message });

    if (tracking) {
      trackDogShare(
        result.action === Share.dismissedAction ? "cancel" : "success",
        tracking,
      );
    }
  } catch (error) {
    sendError(error);
    if (tracking) trackDogShare("error", tracking);
    Alert.alert(unavailableCopy.title, unavailableCopy.message);
  }
};

/** Copies `link` to the clipboard and reports success/failure via
 * `magicToast`. `duration` matches the sheet's own 1500ms success toast. */
export const copyDogLink = async (
  link: string,
  copy: { success: string; failure: string },
  tracking?: ShareTracking,
) => {
  try {
    await Clipboard.setStringAsync(link);
    magicToast.success(copy.success, 1500);
    if (tracking) trackDogShare("success", tracking);
  } catch (error) {
    sendError(error);
    if (tracking) trackDogShare("error", tracking);
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
 * A rejected `Sharing.isAvailableAsync` counts as "can't share files":
 * it is reported through `sendError` and then takes the same
 * short-circuit as a `false` result, so a broken native module still ends
 * up sharing the link instead of throwing out of this function. A missing
 * ref is a thrown error INSIDE the try block, so it takes the same catch
 * path as a rejected capture or a rejected `Sharing.shareAsync` call.
 */
export const shareDogStory = async (params: {
  storyCardRef: RefObject<ComponentRef<typeof View> | null>;
  waitForPhoto: () => Promise<void>;
  hide: () => void;
  dialogTitle: string;
  shareLinkMessage: string;
  copy: ShareDogStoryCopy;
  tracking?: ShareTracking;
}) => {
  const {
    storyCardRef,
    waitForPhoto,
    hide,
    dialogTitle,
    shareLinkMessage,
    copy,
    tracking,
  } = params;

  // Both fallbacks share the plain link, so they keep `option: "story"`
  // and only flip `fallback`. That way "how many story shares completed"
  // and "how many degraded to a link" are the same insight split by one
  // property rather than two unrelated event shapes.
  const fallbackTracking = tracking && { ...tracking, fallback: true };

  let available = false;

  try {
    available = await Sharing.isAvailableAsync();
  } catch (error) {
    sendError(error);
  }

  if (!available) {
    magicToast.alert(copy.storyUnavailable);
    hide();
    await shareDogLink(
      shareLinkMessage,
      copy.sharingNotAvailable,
      fallbackTracking,
    );
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

    // `Sharing.shareAsync` resolves the same way whether the user posted
    // the story or dismissed the sheet, so this is "handed off to the OS",
    // not "definitely posted". The link rows are the only place a cancel
    // is observable.
    if (tracking) trackDogShare("success", tracking);
  } catch (error) {
    sendError(error);
    magicToast.alert(copy.storyFailedFallback);
    hide();
    await shareDogLink(
      shareLinkMessage,
      copy.sharingNotAvailable,
      fallbackTracking,
    );
  }
};
