import type { RootReducer } from "@/store/reducers";
import type { ActionType } from "typesafe-actions";

import { router } from "expo-router";

import { LikeLimitReachedError } from "@pegada/shared/errors/errors";
import { isBefore } from "date-fns";
import { all, call, fork, put, select, takeLatest } from "redux-saga/effects";

import { showLikeLimitReached } from "@/components/LikeLimitReached";
import { getTrcpContext } from "@/contexts/trcp-context";
import { getUnsafeIsPremium } from "@/hooks/use-payments";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";
import {
  endLikeLimitLiveStatus,
  startLikeLimitLiveStatus,
} from "@/services/live-status";
import { Actions } from "@/store/reducers";
import { SwipeAction } from "@/store/reducers/dogs/swipe";
import { SceneName } from "@/types/scene-name";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/use-swipe-gesture";

const swipeUserRequest = function* ({
  payload,
}: ActionType<typeof Actions.dogs.swipe.request>): Generator {
  const { id, swipeType: _swipeType } = payload;

  try {
    // redux-saga's `yield` is `unknown` to TypeScript — the effect knows what it
    // resolves to, the generator signature cannot.
    const isPremium = (yield call(getUnsafeIsPremium)) as boolean;

    // If the user is not premium, check if the like limit has been reached
    if (!isPremium && _swipeType !== Swipe.Dislike) {
      const { likeLimitResetAt } = (yield select(
        (state: RootReducer) => state.dogs.config,
      )) as RootReducer["dogs"]["config"];

      if (likeLimitResetAt && isBefore(new Date(), likeLimitResetAt)) {
        throw new LikeLimitReachedError({ likeLimitResetAt });
      }
    }

    const response = (yield call(getTrcpContext().client.swipe.swipe.mutate, {
      id,
      swipeType: _swipeType,
    })) as { match?: { id: string } } | undefined;

    if (response?.match) {
      router.push({
        pathname: SceneName.NewMatch,
        params: { matchDogId: id, matchId: response.match.id },
      });

      yield call(getTrcpContext().match.getAll.invalidate);
    }

    // A successful swipe means the like limit is no longer active, take
    // down the countdown Live Activity/notification if one is up.
    yield call(endLikeLimitLiveStatus);

    yield put(Actions.dogs.swipe.success());
  } catch (error: unknown) {
    const likeLimitReachedError = getError(error, LikeLimitReachedError);
    if (likeLimitReachedError) {
      const { likeLimitResetAt } = likeLimitReachedError;
      showLikeLimitReached({ likeLimitResetAt });
      // Glanceable countdown outside the app: Dynamic Island/lock screen on
      // iOS, a (promoted) countdown notification on Android.
      yield call(startLikeLimitLiveStatus, likeLimitResetAt);
      yield put(Actions.dogs.swipe.failure({ likeLimitResetAt }));
      return;
    }

    sendError(error);
    yield put(Actions.dogs.swipe.failure({}));
  }
};

const FETCH_THRESHOLD = 5;

const handleCardFetching = function* () {
  const { request, config }: RootReducer["dogs"] = yield select(
    (state: RootReducer) => state.dogs,
  );

  if (
    request.data.length >= FETCH_THRESHOLD ||
    config.likeLimitResetAt ||
    request.error ||
    !config.hasMore
  ) {
    return;
  }

  yield put(Actions.dogs.list.request());
};

export function* handleSwipeUserRequest(
  props: ActionType<typeof Actions.dogs.swipe.request>,
) {
  yield all([fork(() => swipeUserRequest(props)), fork(handleCardFetching)]);
}

export default takeLatest(SwipeAction.SwipeDogRequest, handleSwipeUserRequest);
