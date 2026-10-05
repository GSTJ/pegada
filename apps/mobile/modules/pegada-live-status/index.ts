import { requireOptionalNativeModule } from "expo-modules-core";

export interface LiveStatusCountdownOptions {
  /** Localized title, e.g. "Free likes return in" */
  title: string;
  /** Localized supporting line shown under the title */
  body: string;
  /** Localized label shown once the countdown finishes (iOS stale state) */
  readyLabel: string;
  /** When the countdown window started (ms since epoch), used for progress */
  startTimeMillis: number;
  /** When the countdown ends (ms since epoch) */
  endTimeMillis: number;
  /** URL opened when the activity/notification is tapped */
  deepLink: string;
  /** Localized Android notification channel name (ignored on iOS) */
  channelName: string;
}

interface PegadaLiveStatusModule {
  /**
   * iOS: true on iOS 16.2+ when the user hasn't disabled Live Activities.
   * Android: true on Android 8+ when the app can post notifications.
   */
  isSupported(): boolean;
  startLikeCountdown(options: LiveStatusCountdownOptions): Promise<boolean>;
  endLikeCountdown(): Promise<void>;
  /** Restores a future countdown and removes native state that already expired. */
  reconcileLikeCountdown(): Promise<number | null>;
}

/**
 * Native "live status" surface: an ActivityKit Live Activity (Dynamic Island +
 * lock screen) on iOS, or a quiet countdown notification on Android. Null when
 * the native module isn't present (e.g. Expo Go).
 */
export default requireOptionalNativeModule<PegadaLiveStatusModule>("PegadaLiveStatus");
