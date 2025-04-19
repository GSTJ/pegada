import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Color from "color";

import { LightTheme } from "@pegada/shared/themes/themes";

import { getTrcpContext } from "@/contexts/trcpContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export enum NotificationTokenError {
  Denied = "Push notifications denied"
}

export const getPushNotificationToken = async () => {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Color(LightTheme.colors.primary).alpha(0.7).hex()
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  // Makes sure the user has accepted push notifications permissions
  if (existingStatus !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== "granted") {
      throw new Error(NotificationTokenError.Denied);
    }
  }

  const { data } = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId
  });

  return data;
};

export const setPushNotificationToken = (pushToken: string) => {
  if (!Device.isDevice) return;

  return getTrcpContext().client.user.update.mutate({ pushToken });
};
