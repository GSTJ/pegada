import { produce } from "immer";
import { ActionType, createAction, createAsyncAction, createReducer } from "typesafe-actions";

import { initialState, SwipeDog } from "./swipe";

export enum ListAction {
  FetchDogsRequest = "FETCH_DOGS_REQUEST",
  RefetchDogsRequest = "REFETCH_DOGS_REQUEST",
  CriteriaRefetchDogsRequest = "CRITERIA_REFETCH_DOGS_REQUEST",
  CriteriaRefreshStarted = "CRITERIA_REFRESH_STARTED",
  FetchDogsSuccess = "FETCH_SUCCESS",
  FetchDogsFailure = "FETCH_FAILURE",
}

export type ListRefreshMode = "criteria" | "incremental";

const asyncActions = createAsyncAction(
  ListAction.FetchDogsRequest,
  ListAction.FetchDogsSuccess,
  ListAction.FetchDogsFailure,
)<
  void,
  {
    criteriaRevision: number;
    dogs: SwipeDog[];
    hasMore: boolean;
    mode: ListRefreshMode;
    sessionId: number;
  },
  { criteriaRevision: number; message: string; mode: ListRefreshMode; sessionId: number }
>();

const refetch = createAction(ListAction.RefetchDogsRequest)();
const criteriaRefetch = createAction(ListAction.CriteriaRefetchDogsRequest)();
const criteriaRefreshStarted = createAction(ListAction.CriteriaRefreshStarted)<{
  criteriaRevision: number;
  sessionId: number;
}>();

export const Actions = { ...asyncActions, refetch, criteriaRefetch, criteriaRefreshStarted };

const fetchUsersRequest = (state = initialState) =>
  produce(state, (draft) => {
    if (draft.request.criteriaPending) return draft;
    draft.request.loading = true;
    draft.request.error = undefined;

    return draft;
  });

const refetchUsersRequest = (state = initialState) =>
  produce(state, (draft) => {
    if (draft.request.criteriaPending) return draft;
    draft.request.loading = true;
    draft.request.error = undefined;

    return draft;
  });

const criteriaRefetchUsersRequest = (state = initialState) =>
  produce(state, (draft) => {
    draft.request.loading = true;
    draft.request.error = undefined;
    draft.request.criteriaPending = true;
    draft.request.criteriaRevision += 1;

    return draft;
  });

const criteriaRefreshStartedHandler = (
  state = initialState,
  { payload }: ActionType<typeof criteriaRefreshStarted>,
) =>
  produce(state, (draft) => {
    if (
      draft.config.sessionId !== payload.sessionId ||
      !draft.request.criteriaPending ||
      draft.request.criteriaRevision !== payload.criteriaRevision
    ) {
      return draft;
    }

    const journalCardIds = new Set(
      draft.config.swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
    );

    // The saga acquired both native-motion locks before crossing this boundary.
    // Drop ordinary stale cards, but keep exact objects that can still back a
    // pending/failed restore or the one-level undo.
    draft.request.data = draft.request.data.filter((dog) => journalCardIds.has(dog.id));

    return draft;
  });

const fetchUsersSuccess = (state = initialState, { payload }: ActionType<typeof Actions.success>) =>
  produce(state, (draft) => {
    const exactRevision = draft.request.criteriaRevision === payload.criteriaRevision;
    const requestIsCurrent =
      payload.mode === "criteria"
        ? draft.request.criteriaPending && exactRevision
        : !draft.request.criteriaPending && exactRevision;
    if (draft.config.sessionId !== payload.sessionId || !requestIsCurrent) return draft;

    draft.request.loading = false;
    draft.request.error = undefined;
    if (payload.mode === "criteria") draft.request.criteriaPending = false;
    const freshDogsById = new Map(payload.dogs.map((dog) => [dog.id, dog]));
    const freshDogs = [...freshDogsById.values()];
    if (payload.mode === "criteria") {
      const continuityIds = new Set(draft.request.data.map((dog) => dog.id));
      // Preserve continuity positions, but let a fresh canonical response win
      // by id so Swipe and the DogProfile cache cannot render different dogs.
      // Only a card absent from the response keeps its recovery snapshot.
      draft.request.data = [
        ...draft.request.data.map((dog) => freshDogsById.get(dog.id) ?? dog),
        ...freshDogs.filter((dog) => !continuityIds.has(dog.id)),
      ];
    } else {
      const existingIds = new Set(draft.request.data.map((dog) => dog.id));
      // Keep existing order/transforms while updating a duplicate with the
      // same canonical object already written to the DogProfile cache.
      draft.request.data = [
        ...draft.request.data.map((dog) => freshDogsById.get(dog.id) ?? dog),
        ...freshDogs.filter((dog) => !existingIds.has(dog.id)),
      ];
    }

    draft.config.hasMore = payload.hasMore;

    return draft;
  });

const fetchUsersFailure = (state = initialState, { payload }: ActionType<typeof Actions.failure>) =>
  produce(state, (draft) => {
    const exactRevision = draft.request.criteriaRevision === payload.criteriaRevision;
    const requestIsCurrent =
      payload.mode === "criteria"
        ? draft.request.criteriaPending && exactRevision
        : !draft.request.criteriaPending && exactRevision;
    if (draft.config.sessionId !== payload.sessionId || !requestIsCurrent) return draft;

    draft.request.loading = false;
    draft.request.error = payload.message;
    if (payload.mode === "criteria") draft.request.criteriaPending = false;

    return draft;
  });

export default createReducer<typeof initialState, ActionType<typeof Actions>>(initialState)
  .handleAction(Actions.request, fetchUsersRequest)
  .handleAction(Actions.success, fetchUsersSuccess)
  .handleAction(Actions.failure, fetchUsersFailure)
  .handleAction(Actions.refetch, refetchUsersRequest)
  .handleAction(Actions.criteriaRefetch, criteriaRefetchUsersRequest)
  .handleAction(Actions.criteriaRefreshStarted, criteriaRefreshStartedHandler);
