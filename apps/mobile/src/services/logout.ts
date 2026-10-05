import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import {
  invalidateMatchesWidgetSignedInWork,
  syncMatchesWidgetLoggedOut,
} from "@/services/matchesWidget";
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

    // Close the privacy barrier before the first asynchronous logout step.
    invalidateMatchesWidgetSignedInWork();
    const widgetLogout = syncMatchesWidgetLoggedOut();

    await deleteData(StorageKeys.Token);

    // Clear redux store
    store.dispatch(Actions.logout.logout());

    router.replace(SceneName.SignIn);

    // Never leave the previous account's matches available to a newly mounted
    // authenticated tree, even if the independent payments SDK fails.
    queryClient.clear();

    await Promise.all([payments.logOut().catch(sendError), widgetLogout]);
  } catch (error) {
    sendError(error);
  }
};
