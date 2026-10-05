import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Color from "color";

import { LightTheme } from "@pegada/shared/themes/themes";

import { getTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
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

export enum NotificationCategory {
  ChatMessage = "chat-message",
}

export enum NotificationAction {
  Reply = "reply",
}

// Lets a chat-message push carry a text-input "Reply" action on both
// platforms, so the user can answer straight from the notification
// without opening the app. Handled in `services/linking`.
const registerNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(NotificationCategory.ChatMessage, [
    {
      identifier: NotificationAction.Reply,
      buttonTitle: i18n.t("chat.replyAction"),
      textInput: {
        submitButtonTitle: i18n.t("chat.replyAction"),
        placeholder: "",
      },
    },
  ]);
};

const registerLocalizedChatNotificationSurfaces = async () => {
  if (Platform.OS === "android") {
    // Re-registering updates the channel's user-visible name without changing
    // its stable ID, so an in-app language switch reaches system settings too.
    await Notifications.setNotificationChannelAsync("messages", {
      name: i18n.t("chat.notificationChannelName"),
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Color(LightTheme.colors.primary).alpha(0.7).hex(),
    });
  }

  await registerNotificationCategories();
};

let watchesNotificationLanguage = false;

const watchNotificationLanguage = () => {
  if (watchesNotificationLanguage) return;

  watchesNotificationLanguage = true;
  i18n.on("languageChanged", () => {
    registerLocalizedChatNotificationSurfaces().catch(sendError);
  });
};

export const getPushNotificationToken = async () => {
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: Color(LightTheme.colors.primary).alpha(0.7).hex(),
    });
  }

  // Native category/channel labels follow the user's in-app language, both
  // now and after a runtime language switch.
  await registerLocalizedChatNotificationSurfaces();
  watchNotificationLanguage();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  // Makes sure the user has accepted push notifications permissions
  if (existingStatus !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== "granted") {
      throw new Error(NotificationTokenError.Denied);
    }
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
