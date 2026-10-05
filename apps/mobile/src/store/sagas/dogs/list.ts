import { all, call, put, race, select, take, takeLatest } from "redux-saga/effects";

import { getTrcpContext } from "@/contexts/trcpContext";
import {
  isSwipeDeckMutationHeroLocked,
  waitForSwipeDeckMutationHeroIdle,
} from "@/components/HeroTransition/store";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { Actions, RootReducer } from "@/store/reducers";
import { ListAction, type ListRefreshMode } from "@/store/reducers/dogs/list";
import { LogoutAction } from "@/store/reducers/dogs/logout";
import {
  beginSwipeActionFlight,
  endSwipeActionFlight,
  getIsSwipeActionInFlight,
  isSwipeActionFlightOwner,
  type SwipeActionFlightToken,
  waitForSwipeActionFlightIdle,
} from "@/store/swipeActionFlight";

const MUTATION_WAIT_SLICE_MS = 1_500;

const isListRequestCurrent = (
  dogs: RootReducer["dogs"],
  sessionId: number,
  criteriaRevision: number,
  mode: ListRefreshMode,
) =>
  dogs.config.sessionId === sessionId &&
  dogs.request.criteriaRevision === criteriaRevision &&
  (mode === "criteria" ? dogs.request.criteriaPending : !dogs.request.criteriaPending);

function* waitForListMutationWindow(
  sessionId: number,
  criteriaRevision: number,
  mode: ListRefreshMode,
): Generator<unknown, boolean, unknown> {
  while (true) {
    const dogs = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
    if (!isListRequestCurrent(dogs, sessionId, criteriaRevision, mode)) return false;

    if (isSwipeDeckMutationHeroLocked()) {
      yield call(waitForSwipeDeckMutationHeroIdle, MUTATION_WAIT_SLICE_MS);
      continue;
    }
    if (getIsSwipeActionInFlight()) {
      yield call(waitForSwipeActionFlightIdle, MUTATION_WAIT_SLICE_MS);
      continue;
    }
    return true;
  }
}

function* acquireListMutationLease(
  sessionId: number,
  criteriaRevision: number,
  mode: ListRefreshMode,
): Generator<unknown, SwipeActionFlightToken | null, unknown> {
  while (true) {
    const canMutate = (yield* waitForListMutationWindow(
      sessionId,
      criteriaRevision,
      mode,
    )) as boolean;
    if (!canMutate) return null;

    const token = beginSwipeActionFlight(undefined, "interaction");
    if (token) return token;
    yield call(waitForSwipeActionFlightIdle, MUTATION_WAIT_SLICE_MS);
  }
}

export function* fetchUsersRequest(mode: ListRefreshMode): Generator<unknown, void, unknown> {
  let dogs = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
  const sessionId = dogs.config.sessionId;
  const criteriaRevision = dogs.request.criteriaRevision;
  let ownedMutationToken: SwipeActionFlightToken | null = null;
  if (!isListRequestCurrent(dogs, sessionId, criteriaRevision, mode)) return;

  try {
    if (mode === "criteria") {
      ownedMutationToken = yield* acquireListMutationLease(sessionId, criteriaRevision, mode);
      if (!ownedMutationToken) return;
      yield put(Actions.dogs.list.criteriaRefreshStarted({ criteriaRevision, sessionId }));
      dogs = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
    }

    const queryArgs =
      mode === "criteria"
        ? { limit: dogs.config.limit }
        : {
            limit: dogs.config.limit,

            // Avoids fetching dogs that are already on screen
            notIn: dogs.request.data.map((dog) => dog.id),
          };
    let response: RootReducer["dogs"]["request"]["data"];
    if (mode === "criteria") {
      const queryResult = (yield race({
        response: call(getTrcpContext().client.swipe.all.query, queryArgs),
        logout: take(LogoutAction.Logout),
      })) as {
        response?: RootReducer["dogs"]["request"]["data"];
        logout?: unknown;
      };
      if (queryResult.logout || !queryResult.response) return;
      response = queryResult.response;
    } else {
      response = (yield call(
        getTrcpContext().client.swipe.all.query,
        queryArgs,
      )) as RootReducer["dogs"]["request"]["data"];
      ownedMutationToken = yield* acquireListMutationLease(sessionId, criteriaRevision, mode);
      if (!ownedMutationToken) return;
    }

    const dogsBeforeApply = (yield select(
      (state: RootReducer) => state.dogs,
    )) as RootReducer["dogs"];
    if (
      !isSwipeActionFlightOwner(ownedMutationToken) ||
      isSwipeDeckMutationHeroLocked() ||
      !isListRequestCurrent(dogsBeforeApply, sessionId, criteriaRevision, mode)
    ) {
      return;
    }

    // For each dog, mutate the cache, so that the dog is not fetched again
    for (const dog of response) {
      getTrcpContext().dog.get.setData({ id: dog.id }, dog);
    }

    yield put(
      Actions.dogs.list.success({
        criteriaRevision,
        dogs: response,
        hasMore: response.length === dogs.config.limit,
        mode,
        sessionId,
      }),
    );
  } catch (err) {
    const dogsAtFailure = (yield select((state: RootReducer) => state.dogs)) as RootReducer["dogs"];
    if (!isListRequestCurrent(dogsAtFailure, sessionId, criteriaRevision, mode)) return;
    sendError(err);

    const error = {
      criteriaRevision,
      message: i18n.t("common.somethingWrong"),
      mode,
      sessionId,
    };
    yield put(Actions.dogs.list.failure(error));
  } finally {
    endSwipeActionFlight(ownedMutationToken);
  }
}

function* fetchIncrementalUsersRequest(): Generator<unknown, void, unknown> {
  yield* fetchUsersRequest("incremental");
}

function* fetchCriteriaUsersRequest(): Generator<unknown, void, unknown> {
  yield* fetchUsersRequest("criteria");
}

export default all([
  takeLatest(
    [ListAction.RefetchDogsRequest, ListAction.FetchDogsRequest],
    fetchIncrementalUsersRequest,
  ),
  takeLatest(ListAction.CriteriaRefetchDogsRequest, fetchCriteriaUsersRequest),
]);
