/**
 * Where a chat list has to be scrolled to after the keyboard changes size.
 *
 * Separated from the hook, and from React, for the same reason
 * `keyboard-overlap.ts` is: the interesting part is arithmetic about a
 * viewport that changed height, and it is only observable by replaying a
 * sequence of keyboard events — which needs no renderer and no device.
 *
 * The problem it solves: `views/Chat` keeps the composer above the IME by
 * shrinking the screen container (`paddingBottom: keyboardOverlap`). That
 * shrinks the list's viewport from the BOTTOM while its scroll offset stays
 * put, so the window onto the conversation is anchored by its top edge: every
 * row you were reading at the bottom slides in behind the composer. Tap the
 * field to answer the message in front of you and that message is the first
 * thing to go.
 *
 * WhatsApp anchors the other edge. Keeping the bottom of the window on the
 * same content while the window loses `delta` points of height means moving
 * the offset by exactly `delta` — down when the keyboard opens, back up when
 * it closes. That is the whole rule.
 */

/**
 * Ignore sub-point noise. `keyboardWillChangeFrame` fires for things that are
 * not the keyboard arriving — an autocomplete strip resizing by a fraction of
 * a point — and scrolling the list for those would be visible jitter.
 */
const MIN_DELTA = 1;

/**
 * How close to the end still counts as "at the end".
 *
 * At the end the offset arithmetic and "scroll to the end" agree, but they
 * fail differently: the arithmetic can overshoot the new maximum offset and be
 * clamped, and the amount it is clamped by is the bottom safe-area inset,
 * which `useKeyboardAwareSafeAreaInsets` drops from the content padding in the
 * same commit. Asking for the end is exact whatever the padding does, so at
 * the end that is what we ask for.
 */
const AT_END_THRESHOLD = 24;

export type ChatScrollMetrics = {
  /** Current `contentOffset.y`. */
  offset: number;
  /** `contentSize.height - layoutMeasurement.height - offset`, never negative. */
  distanceFromEnd: number;
};

export type AnchorTarget = { kind: "end" } | { kind: "offset"; offset: number };

/**
 * The scroll position that keeps the bottom of the visible window on the same
 * message, given how much the strip below the list just grew or shrank.
 *
 * @param delta   the change in occluded bottom height, in dp — keyboard plus
 *                composer plus its current safe-area inset. Positive when
 *                more of the screen's bottom just went away. It is also
 *                exactly how far the composer's top edge travelled, which is
 *                the edge a reader judges "did I lose my place" against.
 * @param metrics the list's scroll state BEFORE the change is committed.
 */
export const anchorTargetForKeyboard = (
  delta: number,
  metrics: ChatScrollMetrics,
): AnchorTarget | null => {
  if (!Number.isFinite(delta) || Math.abs(delta) < MIN_DELTA) return null;

  if (metrics.distanceFromEnd <= AT_END_THRESHOLD) return { kind: "end" };

  return { kind: "offset", offset: Math.max(0, metrics.offset + delta) };
};

/** `distanceFromEnd` from a native scroll event's three measurements. */
export const distanceFromEnd = ({
  contentHeight,
  layoutHeight,
  offset,
}: {
  contentHeight: number;
  layoutHeight: number;
  offset: number;
}) => Math.max(0, contentHeight - layoutHeight - offset);
