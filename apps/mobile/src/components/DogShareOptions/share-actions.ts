import type { ShareOption } from "@pegada/shared/analytics/events";
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

/** Which screen the sheet was opened from. The app's own word for the fact
 * the analytics catalogue records as `is_own_dog`. */
export type ShareSource = "own_profile" | "dog_profile";

/** Re-exported so the sheet can name a row without reaching past this module
 * into the shared catalogue for one union. */
export type { ShareOption };

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
 * The two properties that identify a share regardless of how it ended.
 *
 * `source` and `is_own_dog` are the same fact said twice — the sheet only
 * ever opens from a dog's profile or the user's own — so only the
 * catalogued one goes on the wire.
 */
const shareIdentity = (tracking: Omit<ShareTracking, "option">) => ({
  dog_id: tracking.dogId,
  is_own_dog: tracking.source === "own_profile",
});

/**
 * The top of the share funnel: the sheet was opened. Fires once per open,
 * before any row has been picked, so it is the denominator every rate below
 * is measured against.
 */
export const trackDogShareTapped = (tracking: Omit<ShareTracking, "option">) =>
  analytics.track({
    event_type: "Share Tapped",
    event_properties: shareIdentity(tracking),
  });

/**
 * The bottom of the funnel: the flow that open started has finished, however
 * it finished. Exactly one of these follows every "Share Tapped".
 *
 * Which row was used and whether the story degraded to a link ride along as
 * properties rather than as their own event names, so "story shares that
 * completed" and "story shares that fell back" stay one insight split by
 * `option` and `fallback` instead of a set of names to stitch together.
 */
export const trackDogShareCompleted = (
  result: "dismissed" | "error" | "shared",
  tracking: Omit<ShareTracking, "option"> & { option?: ShareOption },
) =>
  analytics.track({
    event_type: "Share Completed",
    event_properties: {
      ...shareIdentity(tracking),
      fallback: Boolean(tracking.fallback),
      option: tracking.option ?? null,
      result,
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
 * gets, so it is tracked as `result: "dismissed"` rather than a success.
 */
export const shareDogLink = async (
  message: string,
  unavailableCopy: { title: string; message: string },
  tracking?: ShareTracking,
) => {
  try {
    const result = await Share.share({ message });

    if (tracking) {
      trackDogShareCompleted(
        result.action === Share.dismissedAction ? "dismissed" : "shared",
        tracking,
      );
    }
  } catch (error) {
    sendError(error);
    if (tracking) trackDogShareCompleted("error", tracking);
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
    if (tracking) trackDogShareCompleted("shared", tracking);
  } catch (error) {
    sendError(error);
    if (tracking) trackDogShareCompleted("error", tracking);
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
 *
 * `isCancelled` covers the one window where the user can walk away
 * mid-flight: the sheet keeps its swipe-to-dismiss gesture while
 * `waitForPhoto` is running, and a dismissal there unmounts the offscreen
 * card the capture needs. Without the check that surfaces as a "card was
 * not mounted" error report, a toast, and then the fallback link share
 * opening the native sheet on top of a screen the user just went back to.
 * When it returns true this bails out quietly instead: no error, no toast,
 * no fallback, tracked as a cancel.
 */
export const shareDogStory = async (params: {
  storyCardRef: RefObject<ComponentRef<typeof View> | null>;
  waitForPhoto: () => Promise<void>;
  hide: () => void;
  dialogTitle: string;
  shareLinkMessage: string;
  copy: ShareDogStoryCopy;
  tracking?: ShareTracking;
  isCancelled?: () => boolean;
}) => {
  const {
    storyCardRef,
    waitForPhoto,
    hide,
    dialogTitle,
    shareLinkMessage,
    copy,
    tracking,
    isCancelled,
  } = params;

  const cancelled = () => {
    if (!isCancelled?.()) return false;
    if (tracking) trackDogShareCompleted("dismissed", tracking);
    return true;
  };

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

    if (cancelled()) return;

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
    if (tracking) trackDogShareCompleted("shared", tracking);
  } catch (error) {
    if (cancelled()) return;

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
