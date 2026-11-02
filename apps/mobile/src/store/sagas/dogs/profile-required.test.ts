import { router } from "expo-router";

import { runSaga } from "redux-saga";

import { sendError } from "@/services/error-tracking";
import rootReducer, { Actions } from "@/store/reducers";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/use-swipe-gesture";

import { fetchUsersRequest } from "./list";
import { swipeUserRequest } from "./swipe";

const mockQuery = jest.fn();
const mockMutate = jest.fn();
jest.mock<Record<string, unknown>>("expo-router", () => ({
  router: { replace: jest.fn() },
}));
jest.mock<Record<string, unknown>>("@/contexts/trcp-context", () => ({
  getTrcpContext: () => ({
    client: {
      swipe: {
        all: { query: mockQuery },
        swipe: { mutate: mockMutate },
      },
    },
  }),
}));
jest.mock<Record<string, unknown>>("@/hooks/use-payments", () => ({
  getUnsafeIsPremium: async () => true,
}));
jest.mock<Record<string, unknown>>("@/components/LikeLimitReached", () => ({
  showLikeLimitReached: jest.fn(),
}));
jest.mock<Record<string, unknown>>("@/services/live-status", () => ({
  endLikeLimitLiveStatus: jest.fn(),
  startLikeLimitLiveStatus: jest.fn(),
}));
jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));
jest.mock<Record<string, unknown>>("@/i18n", () => ({
  t: (key: string) => key,
}));
jest.mock<Record<string, unknown>>(
  "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/use-swipe-gesture",
  () => ({
    Swipe: { Dislike: "NOT_INTERESTED", Like: "INTERESTED" },
  }),
);

const state = { dogs: { config: { limit: 15 }, request: { data: [] } } };
const missingProfile = {
  data: { error: { error_code: "DOG_PROFILE_REQUIRED" } },
};

test.each(["list", "swipe"])(
  "recovers from serialized missing profile on %s",
  async (operation) => {
    mockQuery.mockRejectedValue(missingProfile);
    mockMutate.mockRejectedValue(missingProfile);
    const dispatched: unknown[] = [];
    const options = {
      dispatch: (action: unknown) => dispatched.push(action),
      getState: () => state,
    };
    if (operation === "list") {
      await runSaga(options, fetchUsersRequest as () => Generator).toPromise();
    } else {
      await runSaga(
        options,
        swipeUserRequest,
        Actions.dogs.swipe.request({ id: "target", swipeType: Swipe.Like }),
      ).toPromise();
    }
    expect(dispatched).toContainEqual(Actions.dogs.list.profileRequired());
    expect(router.replace).toHaveBeenCalledWith("/create-profile");
    expect(sendError).not.toHaveBeenCalled();
  },
);

test("still reports unexpected list errors", async () => {
  const error = new Error("network failed");
  mockQuery.mockRejectedValue(error);
  const dispatched: unknown[] = [];
  await runSaga(
    {
      dispatch: (action: unknown) => dispatched.push(action),
      getState: () => state,
    },
    fetchUsersRequest as () => Generator,
  ).toPromise();
  expect(sendError).toHaveBeenCalledWith(error);
  expect(router.replace).not.toHaveBeenCalled();
  expect(dispatched).toContainEqual(
    Actions.dogs.list.failure({ message: "common.somethingWrong" }),
  );
});

test("clears stale cards and disables automatic refills during profile creation", () => {
  const state = rootReducer(undefined, { type: "init" });
  state.dogs.request.loading = true;
  state.dogs.config.hasMore = true;
  const recovered = rootReducer(state, Actions.dogs.list.profileRequired());
  expect(recovered.dogs.request).toStrictEqual({
    data: [],
    loading: false,
    error: undefined,
  });
  expect(recovered.dogs.config.hasMore).toBe(false);
});
