import { Platform } from "react-native";
import Constants from "expo-constants";

import { getTrcpContext } from "@/contexts/trcpContext";
import { analytics } from "@/services/analytics";
import { getLoggedUserID } from "@/services/getLoggedUserID";
import { SceneName } from "@/types/SceneName";
import { sendError } from "./errorTracking";

export const identifyUser = async (
  props: Parameters<typeof analytics.identify>[1]
) => {
  try {
    const userId = await getLoggedUserID();
    return analytics.identify(userId, props);
  } catch (e) {
    sendError(e);
  }
};

export const trackUser = () => {
  return void identifyUser({
    os_name: Platform.OS,
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version ?? "0.0.0"
  });
};

export const getInitialRouteName = async () => {
  try {
    const { authenticated, forceUpdate } =
      await getTrcpContext().client.echo.get.query();

    if (forceUpdate) {
      return SceneName.ForceUpdate;
    }

    if (!authenticated) {
      return SceneName.SignIn;
    }

    const response = await getTrcpContext().myDog.get.fetch();

    if (!response) {
      return SceneName.CreateProfile;
    }

    if (!response.user?.latitude || !response.user?.longitude) {
      return SceneName.AskForLocation;
    }

    return SceneName.Swipe;
  } catch (e) {
    sendError(e);
    return SceneName.SignIn;
  }
};
