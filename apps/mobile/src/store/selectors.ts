import { createSelector } from "reselect";

import { RootReducer } from "@/store/reducers/index";

export const getCards = createSelector(
  (state: RootReducer) => state.dogs.request,
  (request) => request.data,
);

export const getSwipeJournal = (state: RootReducer) => state.dogs.config.swipeJournal;

export const getActiveCards = createSelector(getCards, getSwipeJournal, (cards, swipeJournal) => {
  const hiddenIds = new Set(
    swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
  );
  return cards.filter((card) => !hiddenIds.has(card.id));
});

const ACTIVE_CARDS_TO_RENDER = 4;
const RECENT_JOURNAL_TRANSFORMS_TO_RENDER = 3;

/**
 * Keep only the recent/next-restorable native transforms plus the active
 * window. Older slow operations stay journaled but may remount canonically if
 * they fail later, preventing image-heavy handlers from growing without bound.
 */
export const getRenderableCards = createSelector(
  getCards,
  getSwipeJournal,
  getActiveCards,
  (state: RootReducer) => state.dogs.config.lastCardId,
  (cards, swipeJournal, activeCards, lastCardId) => {
    const deckJournal = swipeJournal.filter((entry) => entry.deckMember);
    const nonFailedHiddenIds = new Set(
      deckJournal.filter((entry) => entry.status !== "failed").map((entry) => entry.id),
    );
    const firstCardWithoutNonFailedBlocker = cards.find((card) => !nonFailedHiddenIds.has(card.id));
    const immediatelyRestorableFailedId = deckJournal.find(
      (entry) => entry.status === "failed" && entry.id === firstCardWithoutNonFailedBlocker?.id,
    )?.id;
    const recentJournalIds = deckJournal
      .slice(-RECENT_JOURNAL_TRANSFORMS_TO_RENDER)
      .map((entry) => entry.id);
    const renderIds = new Set([
      ...recentJournalIds,
      ...(immediatelyRestorableFailedId ? [immediatelyRestorableFailedId] : []),
      ...(lastCardId ? [lastCardId] : []),
      ...activeCards.slice(0, ACTIVE_CARDS_TO_RENDER).map((card) => card.id),
    ]);
    return cards.filter((card) => renderIds.has(card.id));
  },
);

export const getLastCardId = createSelector(
  getCards,
  getSwipeJournal,
  (state: RootReducer) => state.dogs.config.lastCardId,
  (cards, swipeJournal, lastCardId) => {
    if (!lastCardId) return undefined;
    const matchingEntries = swipeJournal.filter((entry) => entry.id === lastCardId);
    if (matchingEntries.length !== 1) return undefined;
    const undoEntry = matchingEntries[0];
    if (undoEntry?.status !== "succeeded") return undefined;

    const hiddenIds = new Set(
      swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
    );
    const currentBeforeUndo = cards.find((card) => !hiddenIds.has(card.id));
    hiddenIds.delete(lastCardId);
    const currentAfterUndo = cards.find((card) => !hiddenIds.has(card.id));

    return currentAfterUndo?.id === lastCardId && currentBeforeUndo?.id !== lastCardId
      ? lastCardId
      : undefined;
  },
);

export const getCurrentCardId = createSelector(getActiveCards, (activeCards) => activeCards[0]?.id);
