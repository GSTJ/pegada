/**
 * The alert opt-in is a fake door, so its done state has to be right in both
 * directions: offering it again to someone who already took it inflates the
 * intent number that decides whether the alert gets built, and hiding it too
 * early loses the answer.
 */
import { isNewDogsAlertRequested } from "./new-dogs-alert";

describe("isNewDogsAlertRequested", () => {
  it("is done when the local flag says so", () => {
    expect(
      isNewDogsAlertRequested({ storedLocally: true, requestedAt: null }),
    ).toBe(true);
  });

  it("is done when the server has the request and the device does not", () => {
    // What a reinstall or a cleared local state looks like. Without the
    // server value the button offers the opt-in again to someone who already
    // opted in.
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
