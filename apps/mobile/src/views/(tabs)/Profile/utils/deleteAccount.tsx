import { Alert } from "react-native";
import { t } from "i18next";

import { getTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { logout } from "@/services/logout";

export const deleteAccount = () => {
  analytics.track({
    event_type: "Delete Account Pressed",
  });

  Alert.alert(i18n.t("profile.deleteAccount"), i18n.t("profile.deleteAccountConfirmation"), [
    {
      text: t("profile.cancel"),
      style: "cancel",
      onPress: () => {
        analytics.track({ event_type: "Delete Account Canceled" });
      },
    },
    {
      text: t("profile.delete"),
      style: "destructive",
      onPress: () => {
        analytics.track({ event_type: "Delete Account Confirmed" });
        // App Store Guideline 5.1.1(v) requires actual account deletion,
        // not just a dog soft-delete. user.deleteMe wipes the user row plus
        // all dependent records (dogs, images, matches, interests, messages)
        // in a single transaction server-side, then we clear the local
        // session via logout().
        getTrcpContext()
          .client.user.deleteMe.mutate()
          .then(() => logout())
          .catch((error) => {
            Alert.alert(t("common.oops"), t("common.tryAgainLater"));
            sendError(error);
          });
      },
    },
  ]);
};
