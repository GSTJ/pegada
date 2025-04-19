import { produce } from "immer";
import {
  ActionType,
  createAction,
  createAsyncAction,
  createReducer
} from "typesafe-actions";

import { initialState, SwipeDog } from "./swipe";

export enum ListAction {
  FetchDogsRequest = "FETCH_DOGS_REQUEST",
  RefetchDogsRequest = "REFETCH_DOGS_REQUEST",
  FetchDogsSuccess = "FETCH_SUCCESS",
  FetchDogsFailure = "FETCH_FAILURE"
}

const asyncActions = createAsyncAction(
  ListAction.FetchDogsRequest,
  ListAction.FetchDogsSuccess,
  ListAction.FetchDogsFailure
)<void, { dogs: SwipeDog[]; hasMore: boolean }, { message: string }>();

const refetch = createAction(ListAction.RefetchDogsRequest)();

export const Actions = { ...asyncActions, refetch };

const fetchUsersRequest = (state = initialState) =>
  produce(state, (draft) => {
    draft.request.loading = true;
    draft.request.error = undefined;

    return draft;
  });

const refetchUsersRequest = (state = initialState) =>
  produce(state, (draft) => {
    draft = initialState;
    return draft;
  });

const fetchUsersSuccess = (
  state = initialState,
  { payload }: ActionType<typeof Actions.success>
) =>
  produce(state, (draft) => {
    draft.request.loading = false;
    draft.request.error = undefined;
    draft.request.data = [...draft.request.data, ...payload.dogs].filter(
      (item, index, arr) =>
        // Sometimes the item order changes, messing up pagination.
        // In those cases the duplicated items returned needs to be removed
        arr.findIndex((current) => current.id === item.id) === index
    );

    draft.config.hasMore = payload.hasMore;

    return draft;
  });

const fetchUsersFailure = (
  state = initialState,
  { payload }: ActionType<typeof Actions.failure>
) =>
  produce(state, (draft) => {
    draft.request.loading = false;
    draft.request.error = payload.message;

    return draft;
  });

export default createReducer<typeof initialState, ActionType<typeof Actions>>(
  initialState
)
  .handleAction(Actions.request, fetchUsersRequest)
  .handleAction(Actions.success, fetchUsersSuccess)
  .handleAction(Actions.failure, fetchUsersFailure)
  .handleAction(Actions.refetch, refetchUsersRequest);
