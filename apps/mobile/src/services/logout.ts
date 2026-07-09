import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { syncMatchesWidgetLoggedOut } from "@/services/matchesWidget";
import { payments } from "@/services/payments";
import { queryClient } from "@/services/queryClient";
import { store } from "@/store";
import { Actions } from "@/store/reducers/dogs";
import { SceneName } from "@/types/SceneName";
import { setInitialNotification } from "./linking/handlers/initialNotification";
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
