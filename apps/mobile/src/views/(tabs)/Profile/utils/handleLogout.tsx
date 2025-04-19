import { Alert } from "react-native";

import i18n from "@/i18n";
import { analytics } from "@/services/analytics";
import { logout } from "@/services/logout";

export const handleLogout = () => {
  analytics.track({ event_type: "Logout Pressed" });
  Alert.alert(i18n.t("profile.logout"), i18n.t("profile.logoutConfirmation"), [
    {
      text: i18n.t("profile.cancel"),
      style: "cancel",
      onPress: () => {
        analytics.track({ event_type: "Logout Canceled" });
      }
    },
    {
      text: i18n.t("profile.logout"),
      style: "destructive",
      onPress: () => {
        analytics.track({ event_type: "Logout Confirmed" });
        void logout();
      }
    }
  ]);
};
