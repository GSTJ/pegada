import { useEffect } from "react";

import { addListener, initial, setItems } from "expo-quick-actions";

import { useTranslation } from "react-i18next";

import { sendError } from "@/services/error-tracking";

import {
  customQuickActionHandler,
  flushPendingQuickAction,
  QuickActionId,
  setPendingQuickAction,
} from "./handlers/action";
import { editProfileIcon, matchesIcon } from "./handlers/icons";

// `enabled` only becomes true after authentication and onboarding finish.
// Until then, keep the last shortcut so it cannot race the auth redirect.
export const useQuickActions = (enabled: boolean) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setPendingQuickAction(initial);
  }, []);

  useEffect(() => {
    const subscription = addListener((action) => {
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
    // Runtime titles follow the in-app language, including live changes.
    const setLocalizedItems = () => {
      setItems([
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
