import { useEffect } from "react";
import * as QuickActions from "expo-quick-actions";
import { useTranslation } from "react-i18next";

import { sendError } from "@/services/errorTracking";
import {
  customQuickActionHandler,
  flushPendingQuickAction,
  QuickActionId,
  setPendingQuickAction,
} from "./handlers/action";
import { editProfileIcon, matchesIcon } from "./handlers/icons";

/**
 * `enabled` must only be `true` once the app has resolved to the fully
 * authenticated, onboarded route (`initialRouteName === SceneName.Swipe`
 * in `app/_layout.tsx`). Quick actions are reachable from the
 * unauthenticated root mount, so -- like `services/linking`'s
 * `processLinks`, which only runs inside the authenticated Swipe screen --
 * we must not navigate before that resolves. A tap that arrives earlier
 * (cold start, or a warm tap while still signed out/onboarding) is held
 * and replayed once `enabled` flips to `true`, instead of being dropped
 * or racing the auth redirect.
 */
export const useQuickActions = (enabled: boolean) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // When the app is not already running, and the user taps a quick action
    setPendingQuickAction(QuickActions.initial);
  }, []);

  useEffect(() => {
    // When the app is already running, and the user taps a quick action
    const subscription = QuickActions.addListener((action) => {
      if (enabled) {
        customQuickActionHandler(action);
        return;
      }

      setPendingQuickAction(action);
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    flushPendingQuickAction();
  }, [enabled]);

  useEffect(() => {
    // Titles come from the runtime API (not the static config plugin) so
    // they follow the user's in-app language choice, not just the device
    // locale. Re-run whenever it changes so an in-app language switch
    // updates the shortcuts without needing an app restart.
    const setLocalizedItems = () => {
      QuickActions.setItems([
        {
          id: QuickActionId.Matches,
          title: t("quickActions.matches"),
          icon: matchesIcon,
        },
        {
          id: QuickActionId.EditProfile,
          title: t("quickActions.editProfile"),
          icon: editProfileIcon,
        },
      ]).catch(sendError);
    };

    setLocalizedItems();
    i18n.on("languageChanged", setLocalizedItems);

    return () => {
      i18n.off("languageChanged", setLocalizedItems);
    };
  }, [t, i18n]);
};
