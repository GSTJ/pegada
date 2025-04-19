import { Alert } from "react-native";
import { t } from "i18next";

import { getTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { logout } from "@/services/logout";

export const deleteAccount = () => {
  analytics.track({
    event_type: "Delete Account Pressed"
  });

  Alert.alert(
    i18n.t("profile.deleteAccount"),
    i18n.t("profile.deleteAccountConfirmation"),
    [
      {
        text: t("profile.cancel"),
        style: "cancel",
        onPress: () => {
          analytics.track({ event_type: "Delete Account Canceled" });
        }
      },
      {
        text: t("profile.delete"),
        style: "destructive",
        onPress: () => {
          analytics.track({ event_type: "Delete Account Confirmed" });
          getTrcpContext()
            .client.myDog.delete.mutate()
            .then(() => logout())
            .catch((error) => {
              Alert.alert(t("common.oops"), t("common.tryAgainLater"));
              sendError(error);
            });
        }
      }
    ]
  );
};
