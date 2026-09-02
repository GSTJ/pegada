import type { AnalyticsPersonProperties } from "@pegada/shared/analytics/events";

import { Platform } from "react-native";

import Constants from "expo-constants";

import { getTrcpContext } from "@/contexts/trcp-context";
import { analytics } from "@/services/analytics";
import { getLoggedUserID } from "@/services/get-logged-user-id";
import { SceneName } from "@/types/scene-name";

import { sendError } from "./error-tracking";

export const identifyUser = async (
  props: Parameters<typeof analytics.identify>[1],
) => {
  try {
    const userId = await getLoggedUserID();
    return analytics.identify(userId, props);
  } catch (error) {
    sendError(error);
  }
};

/**
 * Person properties read off the dog query the app has already fetched.
 *
 * Cache only, never a request: this runs on the swipe screen's mount, which is
 * the frame the deck is trying to render in. An empty object when the query has
 * not resolved yet is correct — `useCustomerPlan` identifies again the moment
 * the plan lands, and the dog fields arrive with the next launch.
 */
const getDogPersonProperties = (): AnalyticsPersonProperties => {
  try {
    const dog = getTrcpContext().myDog.get.getData();
    if (!dog) return { dogs_count: 0, has_photos: false };

    return {
      city: dog.user?.city ?? null,
      dogs_count: 1,
      has_photos: dog.images.length > 0,
      primary_breed: dog.breed?.name ?? null,
    };
  } catch (error) {
    sendError(error);
    return {};
  }
};

export const trackUser = () => {
  return void identifyUser({
    os_name: Platform.OS,
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version ?? "0.0.0",
    ...getDogPersonProperties(),
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
  } catch (error) {
    sendError(error);
    return SceneName.SignIn;
  }
};
