import type { AppStateStatus } from "react-native";

import { useEffect } from "react";
import { AppState } from "react-native";

import Constants from "expo-constants";
import { router } from "expo-router";

import { getTrcpContext } from "@/contexts/trcp-context";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

/** The build the user is on, in the same shape the API compares against. */
export const getAppVersion = () => Constants.expoConfig?.version ?? "0.0.0";

/**
 * The floor the API last reported, kept so the update screen can name it in
 * its analytics without a second round trip on a screen that has no network
 * state of its own.
 *
 * It starts at the running version, which reads as "no gate" until an answer
 * arrives, and an older API that does not send the floor yet leaves it there.
 */
let minimumSupportedVersion = getAppVersion();

export const getMinimumSupportedVersion = () => minimumSupportedVersion;

export const rememberMinimumSupportedVersion = (version?: string) => {
  if (version) minimumSupportedVersion = version;
};

/**
 * A launch is not the only moment a build can fall below the floor.
 *
 * The floor is raised by hand, hours after a store approval, and the phones
 * that matter most at that moment are the ones that never cold start: the app
 * sits in the background for days and comes back to the same JS context, so
 * the check on `getInitialRouteName` never runs again. This re-asks on the way
 * back to the foreground.
 *
 * Once the wall is up it stops asking, so a later foreground does not navigate
 * again and report a second `Update Required Shown` for one wall. That flag is
 * only ever set after the navigation succeeds: latching it on an attempt that
 * threw would leave the app both ungated and no longer asking.
 */
let blocked = false;

/** Long enough that flicking between apps does not turn into a request each time. */
const RECHECK_INTERVAL_MS = 60_000;
let lastCheckedAt = 0;

export const useForceUpdateOnForeground = () => {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status !== "active" || blocked) return;

      const now = Date.now();
      if (now - lastCheckedAt < RECHECK_INTERVAL_MS) return;
      lastCheckedAt = now;

      const check = async () => {
        try {
          const { forceUpdate, minimumSupportedVersion: minimum } =
            await getTrcpContext().client.echo.get.query();

          rememberMinimumSupportedVersion(minimum);

          if (!forceUpdate) return;

          // `replace` alone only swaps the top of the stack: everything the
          // user had pushed stays underneath, and one back gesture puts them
          // straight back into the app the floor just locked them out of.
          // Clearing the stack first leaves the wall with nothing behind it.
          if (router.canDismiss()) router.dismissAll();
          router.replace(SceneName.ForceUpdate);
          blocked = true;
        } catch (error) {
          // Fail open. This runs on every foreground, so a flaky network or an
          // API that is briefly down would otherwise wall off an app that is
          // perfectly up to date.
          sendError(error);
        }
      };

      void check();
    };

    const subscription = AppState.addEventListener("change", onChange);

    return () => subscription.remove();
  }, []);
};
