import type { ShareAction } from "react-native";

/**
 * The values of the three enums below are the property values the catalogue
 * declares for "Empty Deck Action Tapped", so `analytics.track` is what checks
 * they stay in step.
 */
export enum EmptyDeckAction {
  NotifyNewDogs = "notify_new_dogs",
  InviteFriend = "invite_friend",
  /**
   * The body copy tells people to adjust their preferences and this is the
   * only way there from here, so the funnel has to be able to count it.
   */
  Preferences = "preferences",
}

export enum PushPermission {
  Granted = "granted",
  Denied = "denied",
  /** The platform never asked, which on a simulator is every time. */
  Unavailable = "unavailable",
}

export enum ShareOutcome {
  Shared = "shared",
  Dismissed = "dismissed",
  Unavailable = "unavailable",
}

/**
 * `getPushNotificationToken` resolves with a token when the user allowed
 * notifications and with `undefined` when it never got as far as asking,
 * which is what happens off a real device.
 */
export const pushPermissionFromToken = (token: string | undefined) =>
  token ? PushPermission.Granted : PushPermission.Unavailable;

/**
 * `undefined` is the sheet that never opened: `Share.share` rejects on a
 * platform that cannot show it, and counting that as a dismissal would read
 * as people changing their minds.
 */
export const shareOutcomeOf = (result: ShareAction | undefined) => {
  if (!result) return ShareOutcome.Unavailable;

  return result.action === "sharedAction"
    ? ShareOutcome.Shared
    : ShareOutcome.Dismissed;
};

/**
 * The button is done when either source says so. The local flag answers
 * immediately and keeps working offline, and the server value is what brings
 * the state back after a reinstall or after local storage was cleared.
 */
export const isNewDogsAlertRequested = ({
  storedLocally,
  requestedAt,
}: {
  storedLocally: boolean;
  requestedAt?: Date | null;
}) => storedLocally || Boolean(requestedAt);
