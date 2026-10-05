import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Color from "color";

import { LightTheme } from "@pegada/shared/themes/themes";

import { getTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { deleteData, getData, StorageKeys, storeData } from "@/services/storage";
import { pushRegistrationState } from "@/services/pushRegistrationState";

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
// platforms. The action foregrounds the app so `services/linking` can
// authenticate and send the message through one JS runtime.
const registerNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync(NotificationCategory.ChatMessage, [
    {
      identifier: NotificationAction.Reply,
      buttonTitle: i18n.t("chat.replyAction"),
      textInput: {
        submitButtonTitle: i18n.t("chat.replyAction"),
        placeholder: i18n.t("send.placeholder"),
      },
      options: {
        // Foreground delivery keeps one JS runtime responsible for the send,
        // including when either platform launches from a terminated state.
        opensAppToForeground: true,
        // Prevent sending a message from a locked iPhone without confirming
        // the device owner's identity.
        isAuthenticationRequired: Platform.OS === "ios",
      },
    },
  ]);
};

const registerLocalizedNotificationSurfaces = async () => {
  if (Platform.OS === "android") {
    // Re-registering updates the channels' visible names without changing
    // their stable IDs, including after an in-app language switch.
    await Promise.all([
      Notifications.setNotificationChannelAsync("default", {
        name: i18n.t("notifications.defaultChannelName"),
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Color(LightTheme.colors.primary).alpha(0.7).hex(),
      }),
      Notifications.setNotificationChannelAsync("messages", {
        name: i18n.t("chat.notificationChannelName"),
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: Color(LightTheme.colors.primary).alpha(0.7).hex(),
      }),
    ]);
  }

  await registerNotificationCategories();
};

let watchesNotificationLanguage = false;
let notificationRegistrationMutation = Promise.resolve();
let serverPushTokenMutation = Promise.resolve();
let lastKnownPushToken: string | undefined;

const enqueueNotificationRegistration = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = notificationRegistrationMutation.then(operation, operation);
  notificationRegistrationMutation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const enqueueServerPushTokenMutation = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = serverPushTokenMutation.then(operation, operation);
  serverPushTokenMutation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

const watchNotificationLanguage = () => {
  if (watchesNotificationLanguage) return;

  watchesNotificationLanguage = true;
  i18n.on("languageChanged", () => {
    registerLocalizedNotificationSurfaces().catch(sendError);
  });
};

export const getPushNotificationToken = async () => {
  if (!Device.isDevice) return;
  const registration = pushRegistrationState.begin();

  await registerLocalizedNotificationSurfaces();
  watchNotificationLanguage();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  // Makes sure the user has accepted push notifications permissions
  if (existingStatus !== "granted") {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== "granted") {
      throw new Error(NotificationTokenError.Denied);
    }
  }

  if (!registration.isCurrent()) return;

  const token = await enqueueNotificationRegistration(async () => {
    // Logout may have queued native unregistration while permissions or
    // localized surfaces were resolving. A stale request must never register
    // the signed-out installation again afterward.
    if (!registration.isCurrent()) return;

    return Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
  });

  if (!token || !registration.isCurrent()) return;
  lastKnownPushToken = token.data;

  return token.data;
};

export const setPushNotificationToken = (pushToken: string) => {
  if (!Device.isDevice || !pushRegistrationState.enabled) return;

  return enqueueServerPushTokenMutation(async () => {
    if (!pushRegistrationState.enabled) return;

    try {
      // The server atomically moves this installation token away from any
      // previous account before attaching it to the current one.
      await getTrcpContext().client.user.update.mutate({ pushToken });
      await storeData(StorageKeys.PushToken, pushToken);
      lastKnownPushToken = pushToken;
    } catch (error) {
      // If the claim response was lost after the server committed it, make a
      // best-effort compare-and-clear. Native unregistration is the privacy
      // boundary when the network itself is unavailable.
      await getTrcpContext()
        .client.user.update.mutate({ pushToken: null, expectedPushToken: pushToken })
        .catch(sendError);
      await deactivateDeviceNotifications();
      throw error;
    }
  });
};

export const clearPresentedNotifications = async () => {
  try {
    Notifications.clearLastNotificationResponse();
  } catch (error) {
    sendError(error);
  }

  await Promise.all([
    Notifications.dismissAllNotificationsAsync().catch(sendError),
    Notifications.setBadgeCountAsync(0).catch(sendError),
  ]);
};

export const deactivateDeviceNotifications = async () => {
  pushRegistrationState.invalidate();
  if (Device.isDevice) {
    await enqueueNotificationRegistration(() =>
      Notifications.unregisterForNotificationsAsync(),
    ).catch(sendError);
  }
  await clearPresentedNotifications();
};

/** Clears the authenticated server token before removing local credentials. */
export const unregisterPushNotifications = async () => {
  pushRegistrationState.invalidate();
  // Stop local delivery immediately while the authenticated compare-and-clear
  // runs. The server mutation still finishes before logout deletes credentials.
  const deviceDeactivation = deactivateDeviceNotifications();
  const serverDeactivation = enqueueServerPushTokenMutation(async () => {
    try {
      const expectedPushToken = lastKnownPushToken ?? (await getData(StorageKeys.PushToken));
      if (!expectedPushToken) return;

      // Compare-and-clear: an older device logging out cannot erase a token a
      // newer device registered for the same account.
      await getTrcpContext().client.user.update.mutate({
        pushToken: null,
        expectedPushToken,
      });
      await deleteData(StorageKeys.PushToken);
      lastKnownPushToken = undefined;
    } catch (error) {
      sendError(error);
    }
  });
  await Promise.all([deviceDeactivation, serverDeactivation]);
};
