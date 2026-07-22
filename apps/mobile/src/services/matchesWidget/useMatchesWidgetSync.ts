import { useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";

import { api } from "@/contexts/TRPCProvider";
import { sendError } from "@/services/errorTracking";
import { syncMatchesWidget } from "./index";

/**
 * Keeps the home-screen widget in sync with the matches list. Mounted once
 * in the authenticated (app) layout:
 *
 * - on mount and whenever the app comes back to the foreground, refetch the
 *   matches (shared React Query cache, deduped with the Messages tab) and
 *   rewrite the snapshot;
 * - when the app goes to the background, flush whatever is cached so the
 *   widget shows the freshest known state from the home screen.
 *
 * The Messages view also syncs on every query update while it polls.
 */
export const useMatchesWidgetSync = () => {
  const utils = api.useUtils();

  useEffect(() => {
    let disposed = false;

    const syncFromServer = () => {
      utils.match.getAll
        .fetch()
        .then((matches) => {
          if (disposed) return undefined;
          return syncMatchesWidget(matches);
        })
        .catch(() => {
          // Offline or a flaky request: keep the last snapshot on the widget.
        });
    };

    const syncFromCache = () => {
      const matches = utils.match.getAll.getData();
      if (matches) syncMatchesWidget(matches).catch(sendError);
    };

    syncFromServer();

    const subscription = AppState.addEventListener("change", (status: AppStateStatus) => {
      if (status === "active") syncFromServer();
      if (status === "background") syncFromCache();
    });

    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [utils]);
};
