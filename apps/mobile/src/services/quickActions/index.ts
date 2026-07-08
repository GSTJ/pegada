import { useEffect } from "react";
import * as QuickActions from "expo-quick-actions";
import { useTranslation } from "react-i18next";

import { sendError } from "@/services/errorTracking";
import { customQuickActionHandler, QuickActionId } from "./handlers/action";
import { editProfileIcon, matchesIcon } from "./handlers/icons";

export const useQuickActions = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    // When the app is not already running, and the user taps a quick action
    customQuickActionHandler(QuickActions.initial);
  }, []);

  useEffect(() => {
    // When the app is already running, and the user taps a quick action
    const subscription = QuickActions.addListener(customQuickActionHandler);

    return () => {
      subscription.remove();
    };
  }, []);

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
