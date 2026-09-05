import type { AnalyticsPersonProperties } from "@pegada/shared/analytics/events";

import { Platform } from "react-native";

import Constants from "expo-constants";

import { getTrcpContext } from "@/contexts/trcp-context";
import { analytics } from "@/services/analytics";
import { rememberMinimumSupportedVersion } from "@/services/force-update";
import { getLoggedUserID } from "@/services/get-logged-user-id";
import { getData, StorageKeys } from "@/services/storage";
import {
  shouldRetryTransient,
  transientRetryDelayMs,
} from "@/services/transient-retry";
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

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Runs the launch query under the same policy the auth mutations use.
 *
 * `client.echo.get.query()` goes straight down the tRPC client, so nothing
 * retries it: the first request of a cold deployment is also the one request
 * every launch waits on, and a single blip on it used to decide where the
 * user lands. React Query already retries `myDog.get.fetch()`, so only this
 * call needs the wrapper.
 */
const withTransientRetry = async <T>(
  run: () => Promise<T>,
  failureCount = 0,
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (!shouldRetryTransient(failureCount, error)) throw error;

    await wait(transientRetryDelayMs(failureCount));
    return withTransientRetry(run, failureCount + 1);
  }
};

/**
 * Where to land when the launch query never answered.
 *
 * The stored token is the only evidence of a session that survives a failed
 * request, and this branch runs precisely when no request succeeded. Sending a
 * user who holds one to sign in was the loop: they are already signed in, so
 * the login mutation answers "Already logged in" and there is no way forward.
 *
 * Into the app instead. Every screen there fetches for itself, and a token the
 * server actually rejects comes back as a 401, which the tRPC client turns
 * into a real logout. Sign in stays the answer for a device with no token,
 * which is the only case where it is the truth.
 */
const getOfflineRouteName = async () => {
  try {
    const token = await getData(StorageKeys.Token);
    return token ? SceneName.Swipe : SceneName.SignIn;
  } catch (error) {
    sendError(error);
    return SceneName.SignIn;
  }
};

export const getInitialRouteName = async () => {
  try {
    const { authenticated, forceUpdate, minimumSupportedVersion } =
      await withTransientRetry(() => getTrcpContext().client.echo.get.query());

    rememberMinimumSupportedVersion(minimumSupportedVersion);

    if (forceUpdate) {
      return SceneName.ForceUpdate;
    }

    // The server looked at the token and said no. That is an answer, not a
    // failure, so sign in is correct here even with a token on disk.
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
    return getOfflineRouteName();
  }
};
