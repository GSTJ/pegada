/**
 * The empty deck funnel is only readable if "Empty Deck Action Tapped" carries
 * properties that keep the possible answers apart. Both the push and the share
 * APIs answer in three ways rather than two, and the alert opt-in has to know
 * it was already taken or the intent number that decides whether the alert
 * gets built counts the same person twice.
 */
import type { ShareAction } from "react-native";

import {
  isNewDogsAlertRequested,
  PushPermission,
  pushPermissionFromToken,
  ShareOutcome,
  shareOutcomeOf,
} from "./new-dogs-alert";

describe("pushPermissionFromToken", () => {
  it("counts a token as granted", () => {
    expect(pushPermissionFromToken("ExponentPushToken[abc]")).toBe(
      PushPermission.Granted,
    );
  });

  it("counts a missing token as unavailable rather than denied", () => {
    // `getPushNotificationToken` returns undefined without prompting when it
    // is not on a real device. Reading that as a refusal would put simulator
    // and web sessions in the denied bucket.
    expect(pushPermissionFromToken(undefined)).toBe(PushPermission.Unavailable);
  });
});

describe("shareOutcomeOf", () => {
  it("counts a completed share as shared", () => {
    expect(shareOutcomeOf({ action: "sharedAction" } as ShareAction)).toBe(
      ShareOutcome.Shared,
    );
  });

  it("counts a cancelled sheet as dismissed", () => {
    expect(shareOutcomeOf({ action: "dismissedAction" } as ShareAction)).toBe(
      ShareOutcome.Dismissed,
    );
  });

  it("counts a sheet that never opened as unavailable", () => {
    // `Share.share` rejects where the sheet cannot be shown, and there is no
    // result to read. Filing that under dismissed would read as people
    // opening the invite and changing their minds.
    expect(shareOutcomeOf(undefined)).toBe(ShareOutcome.Unavailable);
  });
});

describe("isNewDogsAlertRequested", () => {
  it("is done when the local flag says so", () => {
    expect(
      isNewDogsAlertRequested({ storedLocally: true, requestedAt: null }),
    ).toBe(true);
  });

  it("is done when the server has the request and the device does not", () => {
    // What a reinstall or a cleared local state looks like. Without the
    // server value the button offers the opt-in again and a second tap event
    // lands in the funnel for someone who already opted in.
    expect(
      isNewDogsAlertRequested({
        storedLocally: false,
        requestedAt: new Date("2026-01-01"),
      }),
    ).toBe(true);
  });

  it("is open while the server answer has not arrived", () => {
    expect(
      isNewDogsAlertRequested({ storedLocally: false, requestedAt: undefined }),
    ).toBe(false);
  });

  it("is open when neither source has it", () => {
    expect(
      isNewDogsAlertRequested({ storedLocally: false, requestedAt: null }),
    ).toBe(false);
  });
});
