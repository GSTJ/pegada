import { anchorTargetForKeyboard, distanceFromEnd } from "./keyboard-anchor";

/**
 * The bug these pin: raising the keyboard in a conversation lost your place in
 * it. `views/Chat` shrinks its container by the keyboard's overlap to keep the
 * composer on screen, which takes the height off the BOTTOM of the list's
 * viewport while leaving the scroll offset alone — so the window onto the
 * thread is anchored by its top edge and everything at the bottom, including
 * the message you tapped the field to answer, slides in behind the composer.
 *
 * The numbers below are an iPhone 17e in the seeded 40-message conversation:
 * the composer's top edge travels 301pt when the IME arrives (335pt of
 * keyboard, less the 34pt safe-area inset the composer stops reserving), over
 * a list whose content is 1600pt against an 800pt viewport.
 */

const COMPOSER_TRAVEL = 336;
const MID_HISTORY = { offset: 400, distanceFromEnd: 400 };
const AT_END = { offset: 800, distanceFromEnd: 0 };

describe("anchorTargetForKeyboard", () => {
  it("pushes the offset down by the keyboard's height when the keyboard opens", () => {
    // This is the whole fix: the viewport lost 336pt off its bottom edge, so
    // the offset gains 336pt and the bottom of the window stays on the same
    // message.
    expect(anchorTargetForKeyboard(COMPOSER_TRAVEL, MID_HISTORY)).toStrictEqual(
      {
        kind: "offset",
        offset: 736,
      },
    );
  });

  it("pulls it back by the same amount when the keyboard closes", () => {
    const raised = { offset: 736, distanceFromEnd: 736 };
    expect(anchorTargetForKeyboard(-COMPOSER_TRAVEL, raised)).toStrictEqual({
      kind: "offset",
      offset: 400,
    });
  });

  it("round-trips: open then close puts the list back where it started", () => {
    const opened = anchorTargetForKeyboard(COMPOSER_TRAVEL, MID_HISTORY);
    if (opened?.kind !== "offset") throw new Error("expected an offset target");

    const closed = anchorTargetForKeyboard(-COMPOSER_TRAVEL, {
      offset: opened.offset,
      distanceFromEnd: MID_HISTORY.distanceFromEnd + COMPOSER_TRAVEL,
    });

    expect(closed).toStrictEqual({
      kind: "offset",
      offset: MID_HISTORY.offset,
    });
  });

  it("asks for the end when the list is already at the end", () => {
    // Not `offset + delta`: at the end the content padding changes in the same
    // commit (the bottom safe-area inset is dropped while the keyboard is up),
    // so the arithmetic overshoots the new maximum offset by exactly that
    // inset and gets clamped. "Scroll to the end" is exact whatever the
    // padding does.
    expect(anchorTargetForKeyboard(COMPOSER_TRAVEL, AT_END)).toStrictEqual({
      kind: "end",
    });
  });

  it("treats a few points short of the end as the end", () => {
    expect(
      anchorTargetForKeyboard(COMPOSER_TRAVEL, {
        offset: 790,
        distanceFromEnd: 10,
      }),
    ).toStrictEqual({ kind: "end" });
  });

  it("does not go past the top of the list", () => {
    expect(
      anchorTargetForKeyboard(-COMPOSER_TRAVEL, {
        offset: 40,
        distanceFromEnd: 900,
      }),
    ).toStrictEqual({ kind: "offset", offset: 0 });
  });

  it("ignores sub-point noise", () => {
    // `keyboardWillChangeFrame` fires for things that are not the keyboard
    // arriving. Scrolling the list for those is visible jitter.
    expect(anchorTargetForKeyboard(0, MID_HISTORY)).toBeNull();
    expect(anchorTargetForKeyboard(0.5, MID_HISTORY)).toBeNull();
    expect(anchorTargetForKeyboard(-0.5, MID_HISTORY)).toBeNull();
  });

  it("ignores a delta that is not a number", () => {
    expect(anchorTargetForKeyboard(Number.NaN, MID_HISTORY)).toBeNull();
  });
});

describe("distanceFromEnd", () => {
  it("is how much content is left below the window", () => {
    expect(
      distanceFromEnd({ contentHeight: 1600, layoutHeight: 800, offset: 400 }),
    ).toBe(400);
  });

  it("is zero at the end", () => {
    expect(
      distanceFromEnd({ contentHeight: 1600, layoutHeight: 800, offset: 800 }),
    ).toBe(0);
  });

  it("never goes negative when a bounce overscrolls the end", () => {
    expect(
      distanceFromEnd({ contentHeight: 1600, layoutHeight: 800, offset: 860 }),
    ).toBe(0);
  });
});
