import { produce } from "immer";
import {
  ActionType,
  createAction,
  createAsyncAction,
  createReducer
} from "typesafe-actions";

import type { RouterOutputs } from "@pegada/api";

import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/useSwipeGesture";

export type SwipeDog = RouterOutputs["swipe"]["all"][number];

interface IInitialState {
  request: {
    data: SwipeDog[];
    loading: boolean;
    error?: string;
  };
  config: {
    limit: number;
    hasMore: boolean;
    lastCardId?: string;
    likeLimitResetAt?: Date;
  };
}

export const initialState: IInitialState = {
  request: {
    data: [],
    loading: true,
    error: undefined
  },
  config: {
    limit: 15,
    hasMore: true,
    lastCardId: undefined,
    likeLimitResetAt: undefined
  }
};

export enum SwipeAction {
  SwipeDogRequest = "SWIPE_DOG_REQUEST",
  SwipeDogSuccess = "SWIPE_DOG_SUCCESS",
  SwipeDogFailure = "SWIPE_DOG_FAILURE",
  SwipeBack = "SWIPE_BACK",
  ClearLikeLimit = "CLEAR_LIKE_LIMIT"
}

const asyncActions = createAsyncAction(
  SwipeAction.SwipeDogRequest,
  SwipeAction.SwipeDogSuccess,
  SwipeAction.SwipeDogFailure
)<{ id: string; swipeType: Swipe }, undefined, { likeLimitResetAt?: Date }>();

const swipeBack = createAction(SwipeAction.SwipeBack)();

const clearLikeLimit = createAction(SwipeAction.ClearLikeLimit)();

export const Actions = { ...asyncActions, swipeBack, clearLikeLimit };

const swipeUserRequest = (
  state = initialState,
  { payload }: ActionType<typeof Actions.request>
) =>
  produce(state, (draft) => {
    const { lastCardId } = draft.config;
    const { data: dogs } = draft.request;

    const lastCardIndex = dogs.findIndex((dog) => dog.id === lastCardId);

    // we shouldn't ever discard the current dog
    // this way we are able to 'go back' and avoid flickering issues
    if (lastCardIndex > -1) {
      draft.request.data.splice(lastCardIndex, 1);
    }

    draft.config.lastCardId = payload.id;

    return draft;
  });

const swipeUserSuccess = (state = initialState) =>
  produce(state, (draft) => {
    draft.config.likeLimitResetAt = undefined;

    return draft;
  });

const swipeUserError = (
  state = initialState,
  { payload }: ActionType<typeof asyncActions.failure>
) =>
  produce(state, (draft) => {
    draft.config.likeLimitResetAt = payload.likeLimitResetAt;

    // We should return to the last dog if we have a failure
    draft.config.lastCardId = undefined;

    return draft;
  });

const clearLikeLimitHandler = (state = initialState) =>
  produce(state, (draft) => {
    draft.config.likeLimitResetAt = undefined;

    return draft;
  });

const swipeBackHandler = (state = initialState) =>
  produce(state, (draft) => {
    draft.config.lastCardId = undefined;

    return draft;
  });

export default createReducer<typeof initialState, ActionType<typeof Actions>>(
  initialState
)
  .handleAction(Actions.request, swipeUserRequest)
  .handleAction(Actions.swipeBack, swipeBackHandler)
  .handleAction(asyncActions.failure, swipeUserError)
  .handleAction(asyncActions.success, swipeUserSuccess)
  .handleAction(Actions.clearLikeLimit, clearLikeLimitHandler);
