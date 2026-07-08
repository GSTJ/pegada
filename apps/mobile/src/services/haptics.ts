import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import { sendError } from "@/services/errorTracking";

// Every call is wrapped so a haptics failure (unsupported device, simulator,
// etc.) never throws into calling code — it's purely a "nice to have".
const safely = (perform: () => Promise<void>) => {
  perform().catch(sendError);
};

/** A subtle tick for discrete selection changes, e.g. crossing a swipe threshold. */
const selection = () => {
  safely(() => Haptics.selectionAsync());
};

/**
 * A light tap for low-weight confirmations (e.g. a swipe action).
 * Android is routed through `performAndroidHapticsAsync`, which Expo
 * recommends over `impactAsync` there since it doesn't rely on the
 * `Vibrator` API or the `VIBRATE` permission.
 */
const light = () => {
  safely(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Segment_Tick)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  );
};

/** A medium tap for slightly heavier confirmations (e.g. a like/dislike button press). */
const medium = () => {
  safely(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  );
};

/** Marks a successful outcome, e.g. a new match or a completed purchase. */
const success = () => {
  safely(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  );
};

/** Marks a failed outcome, e.g. a purchase error. */
const error = () => {
  safely(() =>
    Platform.OS === "android"
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
      : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  );
};

export const haptics = {
  selection,
  light,
  medium,
  success,
  error,
};
