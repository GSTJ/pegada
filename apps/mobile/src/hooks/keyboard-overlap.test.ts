import type {
  KeyboardCoordinates,
  KeyboardOverlapEvent,
  KeyboardPlatform,
} from "./keyboard-overlap";

import {
  keyboardOverlapEvents,
  overlapForEvent,
  seedOverlap,
} from "./keyboard-overlap";

/**
 * The bug these pin: CreateProfile, entered by submitting the one-time code,
 * came up padded for a keyboard that was not on screen — ~400dp of dead white
 * below the pinned Create Profile bar, with the Name and Bio fields pushed off
 * the bottom of it. Flows 30 and 36 both fail on `profile-bio` / `profile-name`
 * above `profile-submit`, and the frame buffer shows no keyboard at all.
 *
 * The cause is a gap between two pieces of React Native state. A screen seeds
 * its padding from `Keyboard.metrics()`, which `keyboardDidShow` sets and
 * `keyboardDidHide` clears — so it stays non-null for the WHOLE dismissal
 * animation. The correcting event on iOS was `keyboardWillChangeFrame`, which
 * fires at the START of that animation. A screen pushed in between seeds
 * itself from a dying keyboard and never hears the event that would undo it.
 *
 * So the test is a replay: seed from the metrics a mid-dismissal screen sees,
 * then deliver only the notifications that are still to come, through only the
 * subscriptions the platform declares. Anything not in
 * `keyboardOverlapEvents` is dropped, which is what a real screen does.
 */

const WINDOW_HEIGHT = 956;
const BOTTOM_INSET = 34;
/** iPhone 17 Pro Max, keypad up: the keyboard's top edge sits here. */
const KEYPAD_TOP = 556;
const KEYPAD_HEIGHT = WINDOW_HEIGHT - KEYPAD_TOP;

const KEYBOARD_UP: KeyboardCoordinates = {
  height: KEYPAD_HEIGHT,
  screenY: KEYPAD_TOP,
};

/** What iOS reports once the keyboard has left: its top edge is the window's. */
const KEYBOARD_GONE: KeyboardCoordinates = {
  height: KEYPAD_HEIGHT,
  screenY: WINDOW_HEIGHT,
};

type Notification = {
  coordinates: KeyboardCoordinates;
  name: KeyboardOverlapEvent;
};

/** A screen: seed, then fold in only the notifications it subscribed to. */
const screen = (
  platform: KeyboardPlatform,
  metrics: KeyboardCoordinates | null,
  notifications: Notification[],
) => {
  const subscribed = new Set(keyboardOverlapEvents(platform));
  const common = {
    bottomInset: BOTTOM_INSET,
    platform,
    windowHeight: WINDOW_HEIGHT,
  };

  return notifications
    .filter(({ name }) => subscribed.has(name))
    .reduce(
      (overlap, { coordinates, name }) =>
        overlapForEvent({ ...common, coordinates, name }),
      seedOverlap({ ...common, metrics }),
    );
};

describe("a screen entered while the keyboard is dismissing", () => {
  /**
   * The regression, exactly as it happens: CreateProfile mounts after
   * `keyboardWillChangeFrame` has already gone out, so the only notification
   * left to arrive is `keyboardDidHide`.
   */
  it("ends up with no padding on iOS, not a phantom keyboard", () => {
    expect(
      screen("ios", KEYBOARD_UP, [
        { coordinates: KEYBOARD_GONE, name: "keyboardDidHide" },
      ]),
    ).toBe(0);
  });

  it("ends up with no padding on Android either", () => {
    expect(
      screen("android", KEYBOARD_UP, [
        { coordinates: KEYBOARD_GONE, name: "keyboardDidHide" },
      ]),
    ).toBe(0);
  });
});

describe("a screen entered with the keyboard genuinely up", () => {
  /**
   * The case the seed exists for, and the one `keyboardDidHide` must not
   * break: sign-in's Continue pushes the one-time-code screen, focus moves
   * straight from one field to the next and the IME never leaves, so nothing
   * fires at all.
   */
  it("is padded on its first frame with no events on iOS", () => {
    expect(screen("ios", KEYBOARD_UP, [])).toBe(KEYPAD_HEIGHT);
  });

  it("is padded on its first frame with no events on Android", () => {
    expect(screen("android", KEYBOARD_UP, [])).toBe(
      KEYPAD_HEIGHT + BOTTOM_INSET,
    );
  });
});

describe("the ordinary show and hide", () => {
  it("pads when the keyboard comes up on iOS", () => {
    expect(
      screen("ios", null, [
        { coordinates: KEYBOARD_UP, name: "keyboardWillChangeFrame" },
      ]),
    ).toBe(KEYPAD_HEIGHT);
  });

  it("pads when the keyboard comes up on Android", () => {
    expect(
      screen("android", null, [
        { coordinates: KEYBOARD_UP, name: "keyboardDidShow" },
      ]),
    ).toBe(KEYPAD_HEIGHT + BOTTOM_INSET);
  });

  it("unpads through willChangeFrame alone on iOS", () => {
    expect(
      screen("ios", null, [
        { coordinates: KEYBOARD_UP, name: "keyboardWillChangeFrame" },
        { coordinates: KEYBOARD_GONE, name: "keyboardWillChangeFrame" },
      ]),
    ).toBe(0);
  });

  /** willChangeFrame then didHide is the normal order; it must not re-pad. */
  it("stays unpadded when didHide follows willChangeFrame on iOS", () => {
    expect(
      screen("ios", null, [
        { coordinates: KEYBOARD_UP, name: "keyboardWillChangeFrame" },
        { coordinates: KEYBOARD_GONE, name: "keyboardWillChangeFrame" },
        { coordinates: KEYBOARD_GONE, name: "keyboardDidHide" },
      ]),
    ).toBe(0);
  });

  it("never returns a negative overlap", () => {
    expect(
      overlapForEvent({
        bottomInset: BOTTOM_INSET,
        coordinates: { height: 0, screenY: WINDOW_HEIGHT + 120 },
        name: "keyboardWillChangeFrame",
        platform: "ios",
        windowHeight: WINDOW_HEIGHT,
      }),
    ).toBe(0);
  });
});

describe("keyboardOverlapEvents", () => {
  it("subscribes iOS to the hide it used to miss", () => {
    expect(keyboardOverlapEvents("ios")).toContain("keyboardDidHide");
  });

  it("does not use willChangeFrame on Android, where screenY is not the keyboard", () => {
    expect(keyboardOverlapEvents("android")).not.toContain(
      "keyboardWillChangeFrame",
    );
  });
});
