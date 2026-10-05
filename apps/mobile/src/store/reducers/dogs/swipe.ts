import { produce } from "immer";
import { ActionType, createAction, createAsyncAction, createReducer } from "typesafe-actions";

import type { RouterOutputs } from "@pegada/api";

import { Swipe } from "@/store/swipeTypes";

export type SwipeDog = RouterOutputs["swipe"]["all"][number];

export interface SwipeJournalEntry {
  deckMember: boolean;
  id: string;
  operationId: string;
  sessionId: number;
  status: "failed" | "pending" | "succeeded";
}

interface IInitialState {
  request: {
    data: SwipeDog[];
    loading: boolean;
    criteriaPending: boolean;
    criteriaRevision: number;
    error?: string;
  };
  config: {
    limit: number;
    hasMore: boolean;
    lastCardId?: string;
    sessionId: number;
    swipeJournal: SwipeJournalEntry[];
    likeLimitResetAt?: Date;
  };
}

export const createInitialState = (sessionId = 0): IInitialState => ({
  request: {
    data: [],
    loading: true,
    criteriaPending: false,
    criteriaRevision: 0,
    error: undefined,
  },
  config: {
    limit: 15,
    hasMore: true,
    lastCardId: undefined,
    sessionId,
    swipeJournal: [],
    likeLimitResetAt: undefined,
  },
});

export const initialState = createInitialState();

let nextSwipeOperationId = 0;

export const createSwipeOperationId = () =>
  `swipe-operation-${Date.now().toString(36)}-${(++nextSwipeOperationId).toString(36)}`;

type SwipeRequestPayload = {
  deckMember: boolean;
  id: string;
  operationId: string;
  swipeType: Swipe;
};

export enum SwipeAction {
  SwipeDogRequest = "SWIPE_DOG_REQUEST",
  SwipeDogSuccess = "SWIPE_DOG_SUCCESS",
  SwipeDogFailure = "SWIPE_DOG_FAILURE",
  SwipeBack = "SWIPE_BACK",
  RestoreDeferred = "RESTORE_DEFERRED_SWIPE",
  ClearLikeLimit = "CLEAR_LIKE_LIMIT",
}

const asyncActions = createAsyncAction(
  SwipeAction.SwipeDogRequest,
  SwipeAction.SwipeDogSuccess,
  SwipeAction.SwipeDogFailure,
)<
  SwipeRequestPayload,
  { clearLikeLimit: boolean; id: string; operationId: string; sessionId: number },
  { id: string; likeLimitResetAt?: Date; operationId: string; sessionId: number }
>();

const swipeBack = createAction(SwipeAction.SwipeBack)<{
  id: string;
  operationId: string;
  sessionId: number;
}>();
const restoreDeferred = createAction(SwipeAction.RestoreDeferred)<{
  id: string;
  operationId: string;
  sessionId: number;
}>();

const clearLikeLimit = createAction(SwipeAction.ClearLikeLimit)();

export const Actions = { ...asyncActions, swipeBack, restoreDeferred, clearLikeLimit };

const swipeUserRequest = (state = initialState, { payload }: ActionType<typeof Actions.request>) =>
  produce(state, (draft) => {
    const hiddenIdsBeforeRequest = new Set(
      draft.config.swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
    );
    const currentCardId = draft.request.data.find((dog) => !hiddenIdsBeforeRequest.has(dog.id))?.id;
    if (payload.deckMember && currentCardId !== payload.id) return draft;
    const deckMember = payload.deckMember;

    // A settled undo head can be compacted only when the next swipe replaces
    // it. Pending predecessors stay in the journal so an out-of-order failure
    // can restore that exact dog instead of deleting it from the deck.
    if (deckMember) {
      const settledDeckEntries = draft.config.swipeJournal.filter(
        (entry) => entry.deckMember && entry.status === "succeeded",
      );
      const settledIds = new Set(settledDeckEntries.map((entry) => entry.id));
      const settledOperationIds = new Set(settledDeckEntries.map((entry) => entry.operationId));
      if (settledIds.size > 0) {
        draft.request.data = draft.request.data.filter((dog) => !settledIds.has(dog.id));
        draft.config.swipeJournal = draft.config.swipeJournal.filter(
          (entry) =>
            !entry.deckMember ||
            entry.status !== "succeeded" ||
            !settledOperationIds.has(entry.operationId),
        );
      }
    }

    if (deckMember) {
      const supersededDeckOperationIds = new Set(
        draft.config.swipeJournal
          .filter((entry) => entry.deckMember && entry.id === payload.id)
          .map((entry) => entry.operationId),
      );
      if (supersededDeckOperationIds.size > 0) {
        draft.config.swipeJournal = draft.config.swipeJournal.filter(
          (entry) => !entry.deckMember || !supersededDeckOperationIds.has(entry.operationId),
        );
      }
    }
    draft.config.swipeJournal.push({
      deckMember,
      id: payload.id,
      operationId: payload.operationId,
      sessionId: draft.config.sessionId,
      status: "pending",
    });
    if (deckMember) draft.config.lastCardId = payload.id;

    return draft;
  });

const swipeUserSuccess = (
  state = initialState,
  { payload }: ActionType<typeof asyncActions.success>,
) =>
  produce(state, (draft) => {
    const journalEntry = draft.config.swipeJournal.find(
      (entry) =>
        entry.id === payload.id &&
        entry.operationId === payload.operationId &&
        entry.sessionId === payload.sessionId &&
        entry.status === "pending",
    );
    if (!journalEntry || draft.config.sessionId !== payload.sessionId) return draft;

    if (payload.clearLikeLimit) draft.config.likeLimitResetAt = undefined;

    if (journalEntry.deckMember) journalEntry.status = "succeeded";
    else {
      draft.config.swipeJournal = draft.config.swipeJournal.filter(
        (entry) => entry.operationId !== payload.operationId,
      );
    }
    // A response can land while settled Hero geometry still references this
    // deck. Physical compaction is deferred to the next accepted swipe or an
    // eligible restore, both of which already own the mutation boundary.

    return draft;
  });

const swipeUserError = (
  state = initialState,
  { payload }: ActionType<typeof asyncActions.failure>,
) =>
  produce(state, (draft) => {
    const journalEntry = draft.config.swipeJournal.find(
      (entry) =>
        entry.id === payload.id &&
        entry.operationId === payload.operationId &&
        entry.sessionId === payload.sessionId &&
        entry.status === "pending",
    );
    if (!journalEntry || draft.config.sessionId !== payload.sessionId) return draft;

    if (
      payload.likeLimitResetAt &&
      (!draft.config.likeLimitResetAt || payload.likeLimitResetAt > draft.config.likeLimitResetAt)
    ) {
      draft.config.likeLimitResetAt = payload.likeLimitResetAt;
    }

    // Recording a deck failure does not reveal the card yet. The restore
    // worker first waits until this exact dog would be current and owns the
    // reset flight. Non-deck operations have no native transform to restore.
    if (journalEntry.deckMember) journalEntry.status = "failed";
    else {
      draft.config.swipeJournal = draft.config.swipeJournal.filter(
        (entry) => entry.operationId !== payload.operationId,
      );
    }

    return draft;
  });

const clearLikeLimitHandler = (state = initialState) =>
  produce(state, (draft) => {
    draft.config.likeLimitResetAt = undefined;

    return draft;
  });

const swipeBackHandler = (state = initialState, { payload }: ActionType<typeof swipeBack>) =>
  produce(state, (draft) => {
    if (draft.config.sessionId !== payload.sessionId || draft.config.lastCardId !== payload.id) {
      return draft;
    }

    const undoEntry = draft.config.swipeJournal.find(
      (entry) =>
        entry.id === payload.id &&
        entry.operationId === payload.operationId &&
        entry.sessionId === payload.sessionId,
    );
    if (undoEntry?.status !== "succeeded") return draft;
    if (
      draft.config.swipeJournal.some(
        (entry) => entry.id === payload.id && entry.operationId !== payload.operationId,
      )
    ) {
      return draft;
    }

    const hiddenIds = new Set(
      draft.config.swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
    );
    const currentBeforeUndo = draft.request.data.find((dog) => !hiddenIds.has(dog.id));
    hiddenIds.delete(payload.id);
    const currentAfterUndo = draft.request.data.find((dog) => !hiddenIds.has(dog.id));
    if (currentAfterUndo?.id !== payload.id || currentBeforeUndo?.id === payload.id) return draft;

    draft.config.swipeJournal = draft.config.swipeJournal.filter(
      (entry) => entry.id !== payload.id,
    );
    draft.config.lastCardId = undefined;

    return draft;
  });

const restoreDeferredHandler = (
  state = initialState,
  { payload }: ActionType<typeof restoreDeferred>,
) =>
  produce(state, (draft) => {
    if (draft.config.sessionId !== payload.sessionId) return draft;
    const failedEntry = draft.config.swipeJournal.find(
      (entry) =>
        entry.deckMember &&
        entry.id === payload.id &&
        entry.operationId === payload.operationId &&
        entry.sessionId === payload.sessionId &&
        entry.status === "failed",
    );
    if (!failedEntry) return draft;

    const nonFailedHiddenIds = new Set(
      draft.config.swipeJournal
        .filter((entry) => entry.deckMember && entry.status !== "failed")
        .map((entry) => entry.id),
    );
    const currentAfterRestore = draft.request.data.find((dog) => !nonFailedHiddenIds.has(dog.id));
    if (currentAfterRestore?.id !== payload.id) return draft;

    const compactedDeckEntries = draft.config.swipeJournal.filter(
      (entry) => entry.deckMember && entry.status === "succeeded",
    );
    const compactedIds = new Set(compactedDeckEntries.map((entry) => entry.id));
    const compactedOperationIds = new Set(compactedDeckEntries.map((entry) => entry.operationId));
    if (compactedIds.size > 0) {
      draft.request.data = draft.request.data.filter((dog) => !compactedIds.has(dog.id));
    }
    draft.config.swipeJournal = draft.config.swipeJournal.filter(
      (entry) =>
        !(
          entry.deckMember &&
          entry.id === payload.id &&
          entry.operationId === payload.operationId &&
          entry.sessionId === payload.sessionId &&
          entry.status === "failed"
        ) &&
        (!entry.deckMember ||
          entry.status !== "succeeded" ||
          !compactedOperationIds.has(entry.operationId)),
    );
    // Restoring an older failed dog rewinds deck order, so a newer swipe is no
    // longer a truthful one-tap undo head. Pending entries remain hidden until
    // their own response settles.
    draft.config.lastCardId = undefined;

    return draft;
  });

export default createReducer<typeof initialState, ActionType<typeof Actions>>(initialState)
  .handleAction(Actions.request, swipeUserRequest)
  .handleAction(Actions.swipeBack, swipeBackHandler)
  .handleAction(Actions.restoreDeferred, restoreDeferredHandler)
  .handleAction(asyncActions.failure, swipeUserError)
  .handleAction(asyncActions.success, swipeUserSuccess)
  .handleAction(Actions.clearLikeLimit, clearLikeLimitHandler);
