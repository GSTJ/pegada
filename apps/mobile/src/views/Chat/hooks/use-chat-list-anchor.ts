import type { FlashListRef } from "@shopify/flash-list";

import * as React from "react";

/**
 * Keeps the conversation list at its newest message until the reader takes
 * over.
 *
 * `maintainVisibleContentPosition.startRenderingFromBottom` decides the
 * position from the FIRST committed layout, and on a chat that is not the
 * final one. A row's height changes after it is measured — the day separator
 * `renderItem` puts above a message is ~40pt and only exists once the row on
 * either side of it is known — so the list can be at the end when FlashList
 * scrolls it there and 40pt short of it a commit later, with the newest
 * message clipped behind the composer. Measured on a fresh install's first
 * open: row 40 at y 731..769 against a composer starting at 745.
 *
 * `autoscrollToBottomThreshold` is supposed to cover exactly this, but it only
 * re-pins on the commits where `checkBounds` happens to run, which is why it
 * caught the growth sometimes and not always.
 *
 * So: re-assert the end on every content-size change, and stop the moment the
 * reader drags. After that first drag the threshold owns it again — that is
 * the case it is good at, a new message arriving while you are already at the
 * bottom.
 */
export const useChatListAnchor = <TItem>() => {
  const listRef = React.useRef<FlashListRef<TItem>>(null);
  const readerTookOver = React.useRef(false);

  const onScrollBeginDrag = React.useCallback(() => {
    readerTookOver.current = true;
  }, []);

  const pinToEnd = React.useCallback(() => {
    if (readerTookOver.current) return;
    void listRef.current?.scrollToEnd({ animated: false });
  }, []);

  return {
    listRef,
    /** Spread onto the `FlashList`. */
    listProps: {
      onScrollBeginDrag,
      onContentSizeChange: pinToEnd,
      onLoad: pinToEnd,
    },
  };
};
