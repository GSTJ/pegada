import { all, call, put, select, takeLatest } from "redux-saga/effects";

import { getTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { Actions, RootReducer } from "@/store/reducers";
import { ListAction } from "@/store/reducers/dogs/list";

// Without marking as unknown, saga complains about the swipe all type inference
export function* fetchUsersRequest(): unknown {
  const dogs: RootReducer["dogs"] = yield select(
    (state: RootReducer) => state.dogs
  );

  try {
    const response = yield call(getTrcpContext().client.swipe.all.query, {
      limit: dogs.config.limit,

      // Avoids fetching dogs that are already on screen
      notIn: dogs.request.data.map((dog) => dog.id)
    });

    // For each dog, mutate the cache, so that the dog is not fetched again
    for (const dog of response) {
      getTrcpContext().dog.get.setData({ id: dog.id }, dog);
    }

    yield put(
      Actions.dogs.list.success({
        dogs: response,
        hasMore: response.length === dogs.config.limit
      })
    );
  } catch (err) {
    sendError(err);

    const error = { message: i18n.t("common.somethingWrong") };
    yield put(Actions.dogs.list.failure(error));
  }
}

export default all([
  takeLatest(ListAction.RefetchDogsRequest, fetchUsersRequest),
  takeLatest(ListAction.FetchDogsRequest, fetchUsersRequest)
]);
