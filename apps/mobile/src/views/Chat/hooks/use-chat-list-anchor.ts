import type { AnchorTarget } from "./keyboard-anchor";
import type { FlashListRef } from "@shopify/flash-list";

import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import * as React from "react";

import { anchorTargetForKeyboard, distanceFromEnd } from "./keyboard-anchor";

/**
 * The keyboard's own animation is ~250ms on iOS and a window resize on
 * Android, and the screen container's `paddingBottom` rides that curve through
 * `LayoutAnimation`. A `scrollTo` issued while it is still in flight is
 * clamped against the viewport height it has RIGHT NOW, which is still the
 * tall one — so at the end of a conversation the first attempt lands short by
 * up to the keyboard's height. Re-asserting the same target once the curve has
 * finished is what makes it exact, and re-asserting is a no-op when the first
 * attempt already landed.
 */
const SETTLE_MS = 320;

/**
 * Everything that decides where the conversation list is scrolled to.
 *
 * Two rules, both about the same edge — the bottom of the thread, where the
 * newest message is and where you are almost always reading:
 *
 * **Open on the newest message.**
 * `maintainVisibleContentPosition.startRenderingFromBottom` decides the
 * position from the FIRST committed layout, and on a chat that is not the
 * final one. A row's height changes after it is measured — the day separator
 * `renderItem` puts above a message is ~40pt and only exists once the rows on
 * either side of it are known — so the list can be at the end when FlashList
 * scrolls it there and 40pt short of it a commit later, with the newest
 * message clipped behind the composer. So: re-assert the end on every
 * content-size change, and stop the moment the reader drags. After that first
 * drag `autoscrollToBottomThreshold` owns it again, which is the case it is
 * good at — a new message arriving while you are already at the bottom.
 *
 * **Hold your place when the keyboard moves.**
 * `views/Chat` keeps the composer above the IME by shrinking the screen
 * container, which takes the height off the BOTTOM of the list's viewport
 * while leaving the scroll offset alone: the window onto the conversation is
 * anchored by its top edge, and every row you were reading at the bottom
 * slides in behind the composer. Measured before this hook: the anchor row did
 * not move a single point while the composer rose 301pt, ending 285pt
 * underneath it. Moving the offset by the same amount the viewport lost keeps
 * the bottom edge on the same message, which is what WhatsApp does. The
 * arithmetic is in `keyboard-anchor.ts` and tested there.
 *
 * `occludedBottom` is the height of the strip along the bottom of the screen
 * the list cannot use — keyboard plus composer plus whatever safe-area inset
 * the composer is carrying right now. It is one number rather than the
 * keyboard's on its own because those two move together and by different
 * amounts: `useKeyboardAwareSafeAreaInsets` drops the bottom inset while the
 * IME is up, so the composer shrinks by 34pt in the same commit the keyboard
 * takes 335. `views/Chat` computes it, rather than this hook reading
 * `useKeyboardOverlap` again, because that hook drives `LayoutAnimation` from
 * its listener and a second subscription would configure the next animation
 * twice.
 */
export const useChatListAnchor = <TItem>(occludedBottom: number) => {
  const listRef = React.useRef<FlashListRef<TItem>>(null);
  const readerTookOver = React.useRef(false);
  const metrics = React.useRef({ offset: 0, distanceFromEnd: 0 });
  const previousOcclusion = React.useRef(occludedBottom);
  const pending = React.useRef<(() => void) | null>(null);

  const cancelPending = React.useCallback(() => {
    pending.current?.();
    pending.current = null;
  }, []);

  const onScrollBeginDrag = React.useCallback(() => {
    readerTookOver.current = true;
    // A pending re-assert would fight a reader who starts flicking through the
    // history the instant the keyboard lands. Their drag wins.
    cancelPending();
  }, [cancelPending]);

  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;

      metrics.current = {
        offset: contentOffset.y,
        distanceFromEnd: distanceFromEnd({
          contentHeight: contentSize.height,
          layoutHeight: layoutMeasurement.height,
          offset: contentOffset.y,
        }),
      };
    },
    [],
  );

  const pinToEnd = React.useCallback(() => {
    if (readerTookOver.current) return;
    void listRef.current?.scrollToEnd({ animated: false });
  }, []);

  React.useEffect(() => {
    const delta = occludedBottom - previousOcclusion.current;
    previousOcclusion.current = occludedBottom;

    const target = anchorTargetForKeyboard(delta, metrics.current);
    if (!target) return;

    cancelPending();

    const apply = (anchor: AnchorTarget) => () => {
      const list = listRef.current;
      if (!list) return;

      if (anchor.kind === "end") {
        void list.scrollToEnd({ animated: false });
        return;
      }
      list.scrollToOffset({ offset: anchor.offset, animated: false });
    };

    const run = apply(target);
    run();

    const frame = requestAnimationFrame(run);
    const timer = setTimeout(run, SETTLE_MS);

    const cancel = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
    pending.current = cancel;

    return cancel;
  }, [cancelPending, occludedBottom]);

  return {
    listRef,
    /** Spread onto the `FlashList`. */
    listProps: {
      onScroll,
      onScrollBeginDrag,
      onContentSizeChange: pinToEnd,
      onLoad: pinToEnd,
      // The anchor arithmetic needs `contentOffset` fresh at the moment the
      // keyboard event lands, not at the end of a 16ms coalescing window.
      scrollEventThrottle: 16,
    },
  };
};
