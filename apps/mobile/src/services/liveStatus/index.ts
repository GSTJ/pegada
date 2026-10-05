import { AppState, Platform } from "react-native";
import * as Linking from "expo-linking";

import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import LiveStatus from "../../../modules/pegada-live-status";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
// Apple's Live Activity guidance recommends short-to-medium tasks no longer
// than eight hours. Most freshly exhausted rolling limits are closer to 24h;
// those stay in-app until the user checks again later.
const MAX_IOS_LIVE_ACTIVITY_DURATION_MS = 8 * 60 * 60 * 1000;

let activeResetAt: Date | undefined;
const pendingResetTimes = new Set<number>();
let appStateSubscribed = false;
let initializationPromise: Promise<void> | undefined;
let nativeMutation = Promise.resolve();

const enqueueNativeMutation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = nativeMutation.then(operation, operation);
  nativeMutation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const endIfExpired = () => {
  if (activeResetAt && activeResetAt.getTime() <= Date.now()) {
    endLikeLimitLiveStatus().catch(sendError);
  }
};

const subscribeToAppState = () => {
  if (appStateSubscribed) return;
  appStateSubscribed = true;

  // The countdown ends itself visually (iOS staleDate, Android
  // setTimeoutAfter); this fully removes it once the user comes back.
  AppState.addEventListener("change", (state) => {
    if (state === "active") endIfExpired();
  });
};

export const initializeLikeLimitLiveStatus = () => {
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    const liveStatus = LiveStatus;
    if (!liveStatus) return;

    subscribeToAppState();
    const endTimeMillis = await enqueueNativeMutation(() => liveStatus.reconcileLikeCountdown());

    if (
      typeof endTimeMillis === "number" &&
      Number.isFinite(endTimeMillis) &&
      endTimeMillis > Date.now()
    ) {
      activeResetAt = new Date(endTimeMillis);
    }
  })().catch((error) => {
    initializationPromise = undefined;
    sendError(error);
  });

  return initializationPromise;
};

/**
 * Starts the free-like countdown: a Live Activity with Dynamic Island support
 * on iOS 16.2+, or a quiet native countdown notification on Android. No-ops
 * safely everywhere else.
 */
export const startLikeLimitLiveStatus = async (likeLimitResetAt: Date) => {
  try {
    await initializeLikeLimitLiveStatus();

    const liveStatus = LiveStatus;
    const endTimeMillis = likeLimitResetAt.getTime();
    if (!liveStatus || !Number.isFinite(endTimeMillis) || endTimeMillis <= Date.now()) return;
    if (Platform.OS === "ios" && endTimeMillis - Date.now() > MAX_IOS_LIVE_ACTIVITY_DURATION_MS) {
      return;
    }
    // Same countdown already active or queued (for example, repeated blocked
    // swipes) must not restart or stack the native surface.
    if (activeResetAt?.getTime() === endTimeMillis || pendingResetTimes.has(endTimeMillis)) {
      return;
    }

    pendingResetTimes.add(endTimeMillis);

    await enqueueNativeMutation(async () => {
      const started = await liveStatus.startLikeCountdown({
        title: i18n.t("liveStatus.title"),
        body: i18n.t("liveStatus.body"),
        readyLabel: i18n.t("liveStatus.ready"),
        // The like limit is a rolling 24h window ending at likeLimitResetAt.
        startTimeMillis: endTimeMillis - DAY_IN_MS,
        endTimeMillis,
        deepLink: Linking.createURL(SceneName.Swipe),
        channelName: i18n.t("liveStatus.channelName"),
      });
      activeResetAt = started ? new Date(endTimeMillis) : undefined;
    });
  } catch (err) {
    sendError(err);
  } finally {
    pendingResetTimes.delete(likeLimitResetAt.getTime());
  }
};

/** Ends the live status (likes are available again or the user upgraded). */
export const endLikeLimitLiveStatus = async () => {
  try {
    await initializeLikeLimitLiveStatus();
    const liveStatus = LiveStatus;
    if (liveStatus) {
      await enqueueNativeMutation(async () => {
        await liveStatus.endLikeCountdown();
        activeResetAt = undefined;
      });
    } else {
      activeResetAt = undefined;
    }
  } catch (err) {
    sendError(err);
  }
};
