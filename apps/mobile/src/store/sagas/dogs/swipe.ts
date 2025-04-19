import { router } from "expo-router";
import { isBefore } from "date-fns";
import { all, call, fork, put, select, takeLatest } from "redux-saga/effects";
import { ActionType } from "typesafe-actions";

import { LikeLimitReached } from "@pegada/shared/errors/errors";

import { showLikeLimitReached } from "@/components/LikeLimitReached";
import { getTrcpContext } from "@/contexts/trcpContext";
import { getUnsafeIsPremium } from "@/hooks/usePayments";
import { sendError } from "@/services/errorTracking";
import { getError } from "@/services/getError";
import { Actions, RootReducer } from "@/store/reducers";
import { SwipeAction } from "@/store/reducers/dogs/swipe";
import { SceneName } from "@/types/SceneName";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/useSwipeGesture";

function* swipeUserRequest({
  payload
}: ActionType<typeof Actions.dogs.swipe.request>): any {
  const { id, swipeType: _swipeType } = payload;

  try {
    const isPremium = yield call(getUnsafeIsPremium);

    // If the user is not premium, check if the like limit has been reached
    if (!isPremium && _swipeType !== Swipe.Dislike) {
      const { likeLimitResetAt }: RootReducer["dogs"]["config"] = yield select(
        (state: RootReducer) => state.dogs.config
      );

      if (likeLimitResetAt && isBefore(new Date(), likeLimitResetAt)) {
        throw new LikeLimitReached({ likeLimitResetAt });
      }
    }

    const response = yield call(getTrcpContext().client.swipe.swipe.mutate, {
      id,
      swipeType: _swipeType
    });

    if (response?.match) {
      router.push({
        pathname: SceneName.NewMatch,
        params: { matchDogId: id, matchId: response.match.id }
      });

      yield call(getTrcpContext().match.getAll.invalidate);
    }

    yield put(Actions.dogs.swipe.success());
  } catch (err: any) {
    const likeLimitReachedError = getError(err, LikeLimitReached);
    if (likeLimitReachedError) {
      const { likeLimitResetAt } = likeLimitReachedError;
      showLikeLimitReached({ likeLimitResetAt });
      yield put(Actions.dogs.swipe.failure({ likeLimitResetAt }));
      return;
    }

    sendError(err);
    yield put(Actions.dogs.swipe.failure({}));
  }
}

const FETCH_THRESHOLD = 5;

function* handleCardFetching() {
  const { request, config }: RootReducer["dogs"] = yield select(
    (state: RootReducer) => state.dogs
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
}

export function* handleSwipeUserRequest(
  props: ActionType<typeof Actions.dogs.swipe.request>
) {
  yield all([fork(() => swipeUserRequest(props)), fork(handleCardFetching)]);
}

export default takeLatest(SwipeAction.SwipeDogRequest, handleSwipeUserRequest);
