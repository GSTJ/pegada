import type { NotificationBehavior } from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { isDevice } from "expo-device";
import {
  AndroidImportance,
  getExpoPushTokenAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  setNotificationHandler
} from "expo-notifications";
import Color from "color";

import { LightTheme } from "@pegada/shared/themes/themes";

import { getTrcpContext } from "@/contexts/trcpContext";

setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // Properties for iOS 15+ notification presentation
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export enum NotificationTokenError {
  Denied = "Push notifications denied"
}

export const getPushNotificationToken = async () => {
  if (!isDevice) return;

  if (Platform.OS === "android") {
    await setNotificationChannelAsync("default", {
      name: "default",
      importance: AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Color(LightTheme.colors.primary).alpha(0.7).hex()
    });
  }

  const { status: existingStatus } = await getPermissionsAsync();

  // Makes sure the user has accepted push notifications permissions
  if (existingStatus !== "granted") {
    const { status: newStatus } = await requestPermissionsAsync();
    if (newStatus !== "granted") {
      throw new Error(NotificationTokenError.Denied);
    }
  }

  const { data } = await getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId
  });

  return data;
};

export const setPushNotificationToken = (pushToken: string) => {
  if (!isDevice) return;

  return getTrcpContext().client.user.update.mutate({ pushToken });
};
