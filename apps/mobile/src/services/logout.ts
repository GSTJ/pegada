import { router } from "expo-router";

import { sendError } from "@/services/error-tracking";
import { syncMatchesWidgetLoggedOut } from "@/services/matchesWidget";
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

    // Leave a localized sign-in prompt on the home-screen widget and wipe
    // the cached avatars.
    await syncMatchesWidgetLoggedOut();

    // Clear request caches
    queryClient.clear();
  } catch (error) {
    sendError(error);
  }
};
