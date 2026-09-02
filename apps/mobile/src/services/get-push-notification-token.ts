import { Platform } from "react-native";

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { LightTheme } from "@pegada/shared/themes/themes";
import Color from "color";

import { getTrcpContext } from "@/contexts/trcp-context";
import { analytics } from "@/services/analytics";
import { getLoggedUserID } from "@/services/get-logged-user-id";

Notifications.setNotificationHandler({
  handleNotification: () =>
    Promise.resolve({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
});

export enum NotificationTokenError {
  Denied = "Push notifications denied",
}

/**
 * Records the standing permission state on the person, so "matched but never
 * messaged" can be split by whether the app was ever allowed to tell them.
 */
const setPushPermissionPersonProperty = async (status: string) => {
  const userId = await getLoggedUserID();
  analytics.setPersonProperties(userId, { push_permission_status: status });
};

export const getPushNotificationToken = async () => {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: new Color(LightTheme.colors.primary).alpha(0.7).hex(),
    });
  }

  const { status: existingStatus, canAskAgain } =
    await Notifications.getPermissionsAsync();

  // Makes sure the user has accepted push notifications permissions
  if (existingStatus === "granted") {
    await setPushPermissionPersonProperty(existingStatus);
  } else if (canAskAgain) {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();

    // The only branch that fires an event, because it is the only one where the
    // OS actually asked. The other two run on every swipe screen mount, and an
    // event there would be a daily "denied" per already-denied user rather than
    // the one moment they decided. The standing state is a person property in
    // all three branches instead.
    analytics.track({
      event_type: "Push Permission",
      event_properties: {
        status: newStatus === "granted" ? "granted" : "denied",
      },
    });

    await setPushPermissionPersonProperty(newStatus);

    if (newStatus !== "granted") {
      throw new Error(NotificationTokenError.Denied);
    }
  } else {
    // iOS only prompts once. After a denial `requestPermissionsAsync` resolves
    // immediately with the old answer and nothing is shown, so asking again
    // here would be a silent no-op reported as a fresh decision.
    await setPushPermissionPersonProperty(existingStatus);
    throw new Error(NotificationTokenError.Denied);
  }

  const { data } = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return data;
};

export const setPushNotificationToken = (pushToken: string) => {
  if (!Device.isDevice) return;

  return getTrcpContext().client.user.update.mutate({ pushToken });
};
