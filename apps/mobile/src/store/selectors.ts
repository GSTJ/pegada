import { createSelector } from "reselect";

import { RootReducer } from "@/store/reducers/index";

export const getCards = createSelector(
  (state: RootReducer) => state.dogs.request,
  (request) => request.data
);

export const getLastCardId = (state: RootReducer) =>
  state.dogs.config.lastCardId;

export const getActiveCards = createSelector(
  getCards,
  getLastCardId,
  (cards, lastCardId) => cards.filter((card) => card.id !== lastCardId)
);

export const getCurrentCardId = createSelector(
  getActiveCards,
  (activeCards) => activeCards[0]?.id
);
