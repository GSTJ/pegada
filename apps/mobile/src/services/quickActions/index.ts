import { useEffect, useRef } from "react";
import * as QuickActions from "expo-quick-actions";
import { useTranslation } from "react-i18next";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import {
  captureInitialQuickAction,
  clearPendingQuickAction,
  customQuickActionHandler,
  flushPendingQuickAction,
  QuickActionId,
  setPendingQuickAction,
} from "./handlers/action";
import { createLatestValueCommitter } from "./coordinator";
import { findDogsIcon, matchesIcon } from "./handlers/icons";

const setQuickActionItems = createLatestValueCommitter<QuickActions.Action[]>(
  (items) => QuickActions.setItems(items),
  sendError,
);

/**
 * Quick actions are visible and actionable only after the app resolves to
 * the authenticated, onboarded Swipe route. A cold-start action can wait
 * while that route is unresolved, but a confirmed signed-out or onboarding
 * route clears it so it cannot replay after a later sign-in.
 */
export const useQuickActions = (initialRouteName: SceneName | undefined) => {
  const { t, i18n } = useTranslation();
  const enabled = initialRouteName === SceneName.Swipe;
  const initialRouteNameRef = useRef(initialRouteName);

  useEffect(() => {
    initialRouteNameRef.current = initialRouteName;
  }, [initialRouteName]);

  useEffect(() => {
    // When the app is not already running, and the user taps a quick action
    captureInitialQuickAction(QuickActions.initial);
  }, []);

  useEffect(() => {
    // When the app is already running, and the user taps a quick action
    const subscription = QuickActions.addListener((action) => {
      if (initialRouteNameRef.current === SceneName.Swipe) {
        customQuickActionHandler(action);
        return;
      }

      if (initialRouteNameRef.current === undefined) {
        setPendingQuickAction(action);
        return;
      }

      clearPendingQuickAction();
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (initialRouteName === undefined) return;

    if (!enabled) {
      clearPendingQuickAction();
      return;
    }

    flushPendingQuickAction();
  }, [enabled, initialRouteName]);

  useEffect(() => {
    // Titles come from the runtime API (not the static config plugin) so
    // they follow the user's in-app language choice, not just the device
    // locale. Re-run whenever it changes so an in-app language switch
    // updates the shortcuts without needing an app restart.
    const setLocalizedItems = () => {
      setQuickActionItems([
        {
          id: QuickActionId.FindDogs,
          title: t("quickActions.findDogs"),
          icon: findDogsIcon,
        },
        {
          id: QuickActionId.Matches,
          title: t("quickActions.matches"),
          icon: matchesIcon,
        },
      ]);
    };

    if (!enabled) {
      setQuickActionItems([]);
      return;
    }

    setLocalizedItems();
    i18n.on("languageChanged", setLocalizedItems);

    return () => {
      i18n.off("languageChanged", setLocalizedItems);
    };
  }, [enabled, t, i18n]);
};
