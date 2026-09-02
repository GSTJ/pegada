import { router } from "expo-router";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { payments } from "@/services/payments";
import { queryClient } from "@/services/query-client";
import { store } from "@/store";
import { Actions } from "@/store/reducers/dogs";
import { SceneName } from "@/types/scene-name";

import { setInitialNotification } from "./linking/handlers/initial-notification";
import { deleteData, StorageKeys } from "./storage";

export const logout = async () => {
  try {
    setInitialNotification(undefined);

    await deleteData(StorageKeys.Token);

    // Clear redux store
    store.dispatch(Actions.logout.logout());

    router.replace(SceneName.SignIn);

    await payments.logOut();

    // Clear request caches
    queryClient.clear();
  } catch (error) {
    sendError(error);
  } finally {
    // In `finally` because `payments.logOut()` above throws when RevenueCat is
    // already anonymous, which is a normal state to log out from — and a reset
    // skipped there would leave the next person to sign in on this device
    // inheriting the previous one's distinct id. Account deletion routes
    // through here too, so one call covers both.
    analytics.reset();
  }
};
