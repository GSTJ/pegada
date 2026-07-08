import { AppState } from "react-native";
import * as Linking from "expo-linking";

import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import LiveStatus from "../../../modules/pegada-live-status";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Tracks the countdown started in this JS session so we only issue native
// end calls when there's something to end. On iOS the activity also carries
// a staleDate, so anything left over from a killed app dims by itself and
// gets cleaned up on the next start.
let activeResetAt: Date | undefined;
let appStateSubscribed = false;

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

/**
 * Starts the "likes recharging" live status: a Live Activity with Dynamic
 * Island support on iOS 16.2+, a promoted (Android 16+) or regular countdown
 * notification on Android. No-ops safely everywhere else.
 */
export const startLikeLimitLiveStatus = async (likeLimitResetAt: Date) => {
  try {
    const endTimeMillis = new Date(likeLimitResetAt).getTime();
    if (!LiveStatus || endTimeMillis <= Date.now()) return;
    // Same countdown already live (e.g. repeated blocked swipes), keep it.
    if (activeResetAt?.getTime() === endTimeMillis) return;

    activeResetAt = new Date(endTimeMillis);
    subscribeToAppState();

    await LiveStatus.startLikeCountdown({
      title: i18n.t("liveStatus.title"),
      body: i18n.t("liveStatus.body"),
      readyLabel: i18n.t("liveStatus.ready"),
      // The like limit is a rolling 24h window ending at likeLimitResetAt.
      startTimeMillis: endTimeMillis - DAY_IN_MS,
      endTimeMillis,
      deepLink: Linking.createURL(SceneName.Swipe),
      channelName: i18n.t("liveStatus.channelName"),
    });
  } catch (err) {
    sendError(err);
  }
};

/** Ends the live status (likes are available again or the user upgraded). */
export const endLikeLimitLiveStatus = async () => {
  if (!LiveStatus || !activeResetAt) return;
  activeResetAt = undefined;

  try {
    await LiveStatus.endLikeCountdown();
  } catch (err) {
    sendError(err);
  }
};
