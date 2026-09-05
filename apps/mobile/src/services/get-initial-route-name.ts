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
 * Ceiling on one attempt at the launch query.
 *
 * Deliberately shorter than the tRPC client's own 15 second ceiling (see
 * contexts/trpc-provider). That one is sized for a request a screen is waiting
 * to render, where waiting is the only option. This one is sized for a request
 * the splash screen is waiting on, where a second attempt is worth more than a
 * long first one. Four seconds clears a function that has to boot and a Prisma
 * engine that has to start, and leaves room for the retries inside the budget
 * below.
 */
const LAUNCH_QUERY_TIMEOUT_MS = 4_000;

/**
 * Ceiling on the whole decision, retries and the dog query included.
 *
 * The fallback below answers the same question from disk, instantly, so there
 * is no reason to hold the splash screen much past one cold boot while the
 * network makes its mind up. `useProtectedRoute` re-runs this when the route
 * segments change, so an unbounded launch was paid for twice: a phone with no
 * connection sat on the splash screen for a minute and a half.
 */
export const LAUNCH_ROUTE_BUDGET_MS = 10_000;

/**
 * One attempt at the launch query, abandoned rather than left hanging.
 *
 * `client.echo.get.query()` goes straight down the tRPC client, so nothing
 * retries it and nothing but the client's own long timeout stops it: the first
 * request of a cold deployment is also the one request every launch waits on,
 * and a single blip on it used to decide where the user lands.
 */
const queryLaunchState = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LAUNCH_QUERY_TIMEOUT_MS);

  try {
    return await getTrcpContext().client.echo.get.query(undefined, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Retries the launch query under the same policy the auth mutations use, for
 * as long as the budget can still pay for another attempt. React Query already
 * retries `myDog.get.fetch()`, so only this call needs the wrapper.
 */
const withTransientRetry = async <T>(
  run: () => Promise<T>,
  deadline: number,
  failureCount = 0,
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (!shouldRetryTransient(failureCount, error)) throw error;

    const delay = transientRetryDelayMs(failureCount);
    // Never start an attempt that cannot finish before the budget runs out.
    // Firing it would cost a request nobody is left waiting for.
    if (Date.now() + delay + LAUNCH_QUERY_TIMEOUT_MS > deadline) throw error;

    await wait(delay);
    return withTransientRetry(run, deadline, failureCount + 1);
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

const resolveInitialRouteName = async (deadline: number) => {
  try {
    const { authenticated, forceUpdate, minimumSupportedVersion } =
      await withTransientRetry(queryLaunchState, deadline);

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

export const getInitialRouteName = async () => {
  const deadline = Date.now() + LAUNCH_ROUTE_BUDGET_MS;

  let budgetTimer: ReturnType<typeof setTimeout> | undefined;
  const budgetSpent = new Promise<void>((resolve) => {
    budgetTimer = setTimeout(resolve, LAUNCH_ROUTE_BUDGET_MS);
  });

  try {
    return await Promise.race([
      resolveInitialRouteName(deadline),
      budgetSpent.then(getOfflineRouteName),
    ]);
  } finally {
    clearTimeout(budgetTimer);
  }
};
