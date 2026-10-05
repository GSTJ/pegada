import { router } from "expo-router";
import { isBefore } from "date-fns";
import { all, call, cancel, cancelled, fork, put, select, take } from "redux-saga/effects";
import { ActionType } from "typesafe-actions";

import { LikeLimitReached } from "@pegada/shared/errors/errors";

import {
  isSwipeDeckMutationHeroLocked,
  waitForSwipeDeckMutationHeroIdle,
} from "@/components/HeroTransition/store";
import { showLikeLimitReached } from "@/components/LikeLimitReached";
import { getTrcpContext } from "@/contexts/trcpContext";
import { getUnsafeIsPremium } from "@/hooks/usePayments";
import { sendError } from "@/services/errorTracking";
import { getError } from "@/services/getError";
import { Actions, RootReducer } from "@/store/reducers";
import { LogoutAction } from "@/store/reducers/dogs/logout";
import { SwipeAction } from "@/store/reducers/dogs/swipe";
import {
  beginSwipeRestoreFlight,
  cancelSwipeRestoreFlight,
  commitSwipeRestoreFlight,
  endSwipeActionFlight,
  waitForSwipeActionFlightIdle,
  type SwipeActionFlightToken,
} from "@/store/swipeActionFlight";
import { SceneName } from "@/types/SceneName";
import { Swipe } from "@/store/swipeTypes";

const RESTORE_WAIT_SLICE_MS = 1_500;

function* acquireFailedSwipeRestore(
  id: string,
  operationId: string,
  sessionId: number,
): Generator<any, SwipeActionFlightToken | null, unknown> {
  while (true) {
    const dogs = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
    const failedEntry = dogs.config.swipeJournal.find(
      (entry) =>
        entry.deckMember &&
        entry.id === id &&
        entry.operationId === operationId &&
        entry.sessionId === sessionId &&
        entry.status === "failed",
    );
    if (!failedEntry || dogs.config.sessionId !== sessionId) return null;

    const nonFailedHiddenIds = new Set(
      dogs.config.swipeJournal
        .filter((entry) => entry.deckMember && entry.status !== "failed")
        .map((entry) => entry.id),
    );
    const currentAfterRestore = dogs.request.data.find((dog) => !nonFailedHiddenIds.has(dog.id));
    if (currentAfterRestore?.id !== id) {
      // A later failed card stays hidden until removing its own entry would
      // actually make it current. Any deck action can change that ordering.
      yield take("*");
      continue;
    }

    if (isSwipeDeckMutationHeroLocked()) {
      yield call(waitForSwipeDeckMutationHeroIdle, RESTORE_WAIT_SLICE_MS);
      continue;
    }

    const restoreToken: SwipeActionFlightToken | null = beginSwipeRestoreFlight(id);
    if (restoreToken) return restoreToken;

    yield call(waitForSwipeActionFlightIdle, RESTORE_WAIT_SLICE_MS);
  }
}

function* swipeUserRequest({ payload }: ActionType<typeof Actions.dogs.swipe.request>): any {
  const { id, operationId, swipeType: _swipeType } = payload;
  let ownedRestoreToken: SwipeActionFlightToken | null = null;
  let mutationCommitted = false;

  try {
    const operation = (yield select((state: RootReducer) =>
      state.dogs.config.swipeJournal.find(
        (entry) => entry.id === id && entry.operationId === operationId,
      ),
    )) as RootReducer["dogs"]["config"]["swipeJournal"][number] | undefined;
    if (!operation || operation.status !== "pending") return;
    const { sessionId } = operation;

    const isPremium = yield call(getUnsafeIsPremium);

    const operationAfterPremiumCheck = (yield select((state: RootReducer) =>
      state.dogs.config.swipeJournal.find(
        (entry) =>
          entry.id === id &&
          entry.operationId === operationId &&
          entry.sessionId === sessionId &&
          entry.status === "pending",
      ),
    )) as RootReducer["dogs"]["config"]["swipeJournal"][number] | undefined;
    if (!operationAfterPremiumCheck) return;

    // If the user is not premium, check if the like limit has been reached
    if (!isPremium && _swipeType !== Swipe.Dislike) {
      const { likeLimitResetAt }: RootReducer["dogs"]["config"] = yield select(
        (state: RootReducer) => state.dogs.config,
      );

      if (likeLimitResetAt && isBefore(new Date(), likeLimitResetAt)) {
        throw new LikeLimitReached({ likeLimitResetAt });
      }
    }

    const response = yield call(getTrcpContext().client.swipe.swipe.mutate, {
      id,
      swipeType: _swipeType,
    });

    const operationAfterResponse = (yield select((state: RootReducer) =>
      state.dogs.config.swipeJournal.find(
        (entry) =>
          entry.id === id &&
          entry.operationId === operationId &&
          entry.sessionId === sessionId &&
          entry.status === "pending",
      ),
    )) as RootReducer["dogs"]["config"]["swipeJournal"][number] | undefined;
    if (!operationAfterResponse) return;

    const likeLimitResetAt = (yield select(
      (state: RootReducer) => state.dogs.config.likeLimitResetAt,
    )) as Date | undefined;
    const clearLikeLimit =
      Boolean(isPremium) || Boolean(likeLimitResetAt && !isBefore(new Date(), likeLimitResetAt));
    yield put(Actions.dogs.swipe.success({ clearLikeLimit, id, operationId, sessionId }));
    mutationCommitted = true;

    if (response?.match) {
      router.push({
        pathname: SceneName.NewMatch,
        params: { matchDogId: id, matchId: response.match.id },
      });

      yield call(getTrcpContext().match.getAll.invalidate);
    }
  } catch (err: any) {
    if (mutationCommitted) {
      sendError(err);
      return;
    }
    const dogsAtFailure = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
    const operation = dogsAtFailure.config.swipeJournal.find(
      (entry) => entry.id === id && entry.operationId === operationId && entry.status === "pending",
    );
    if (!operation || dogsAtFailure.config.sessionId !== operation.sessionId) return;
    const { sessionId } = operation;
    const likeLimitReachedError = getError(err, LikeLimitReached);
    if (likeLimitReachedError) {
      const { likeLimitResetAt } = likeLimitReachedError;
      yield put(Actions.dogs.swipe.failure({ id, likeLimitResetAt, operationId, sessionId }));
      showLikeLimitReached({ likeLimitResetAt });
    } else {
      yield put(Actions.dogs.swipe.failure({ id, operationId, sessionId }));
      sendError(err);
    }

    while (true) {
      const deferredToken: SwipeActionFlightToken | null = yield* acquireFailedSwipeRestore(
        id,
        operationId,
        sessionId,
      );
      if (!deferredToken) return;
      ownedRestoreToken = deferredToken;
      if (!commitSwipeRestoreFlight(id, deferredToken)) {
        endSwipeActionFlight(deferredToken);
        ownedRestoreToken = null;
        continue;
      }
      yield put(Actions.dogs.swipe.restoreDeferred({ id, operationId, sessionId }));

      // The reducer repeats eligibility at the mutation boundary. If another
      // failure changed card order after token acquisition, release this
      // rejected lease and keep the same worker waiting for its next turn.
      const dogs = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
      const stillHeld = dogs.config.swipeJournal.some(
        (entry) =>
          entry.id === id &&
          entry.operationId === operationId &&
          entry.sessionId === sessionId &&
          entry.status === "failed",
      );
      if (stillHeld) {
        endSwipeActionFlight(deferredToken);
        ownedRestoreToken = null;
        continue;
      }

      if (dogs.config.sessionId !== sessionId) {
        endSwipeActionFlight(deferredToken);
        ownedRestoreToken = null;
        return;
      }

      const hiddenIds = new Set(
        dogs.config.swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
      );
      const currentCardId = dogs.request.data.find((dog) => !hiddenIds.has(dog.id))?.id;
      if (currentCardId !== id) {
        endSwipeActionFlight(deferredToken);
      }
      ownedRestoreToken = null;
      return;
    }
  } finally {
    if (yield cancelled()) endSwipeActionFlight(ownedRestoreToken);
  }
}

const FETCH_THRESHOLD = 5;

function* handleCardFetching() {
  const { request, config }: RootReducer["dogs"] = yield select((state: RootReducer) => state.dogs);
  const hiddenIds = new Set(
    config.swipeJournal.filter((entry) => entry.deckMember).map((entry) => entry.id),
  );
  const activeCardCount = request.data.filter((dog) => !hiddenIds.has(dog.id)).length;

  if (
    activeCardCount >= FETCH_THRESHOLD ||
    request.loading ||
    config.likeLimitResetAt ||
    request.error ||
    !config.hasMore
  ) {
    return;
  }

  yield put(Actions.dogs.list.request());
}

export function* handleSwipeUserRequest(props: ActionType<typeof Actions.dogs.swipe.request>) {
  yield all([fork(() => swipeUserRequest(props)), fork(handleCardFetching)]);
}

function* watchSwipeRequestsForSession(): Generator<any, never, any> {
  while (true) {
    const request: ActionType<typeof Actions.dogs.swipe.request> = yield take(
      SwipeAction.SwipeDogRequest,
    );
    yield fork(handleSwipeUserRequest, request);
  }
}

function* watchSwipeRequestSessions(): Generator<any, never, any> {
  while (true) {
    const sessionTask = yield fork(watchSwipeRequestsForSession);
    yield take(LogoutAction.Logout);
    yield cancel(sessionTask);
    cancelSwipeRestoreFlight();
  }
}

export default fork(watchSwipeRequestSessions);
