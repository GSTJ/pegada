import { useEffect } from "react";

import * as Notifications from "expo-notifications";

import { sendError } from "@/services/error-tracking";

import {
  claimNotification,
  consumeInitialNotification,
  setInitialNotification,
} from "./handlers/initial-notification";
import {
  customNotificationHandler,
  getNotificationId,
  getNotificationKind,
  getNotificationUrl,
} from "./handlers/notification";

export const processLinks = () => {
  // Consuming clears the stored tap in the same call, and hands back nothing
  // for a tap the listener below already handled. Without that, every mount of
  // this screen re-ran the whole handler on the last tap: a second
  // "Push Notification Opened", and a second jump to the notification target.
  const initialNotification = consumeInitialNotification();

  if (initialNotification) {
    // The handler is synchronous — expo-router's push is — so a rejected
    // promise was never the failure mode here; a thrown "Invalid notification
    // url" was, and `.catch` never saw it.
    try {
      customNotificationHandler(
        initialNotification.url,
        initialNotification.kind,
      );
    } catch (error) {
      sendError(error);
    }
  }

  // When the app is already running, and the user clicks on a notification
  const notificationSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      // Claiming here is what marks the tap as spent for the mount path, and
      // it also covers two of these listeners briefly overlapping while the
      // screen remounts.
      if (!claimNotification(getNotificationId(response))) return;

      const url = getNotificationUrl(response);
      try {
        customNotificationHandler(url, getNotificationKind(response));
      } catch (error) {
        sendError(error);
      }
    });

  return {
    remove: () => {
      notificationSubscription.remove();
    },
  };
};

const storeNotification = (response: Notifications.NotificationResponse) => {
  setInitialNotification({
    id: getNotificationId(response),
    url: getNotificationUrl(response),
    kind: getNotificationKind(response),
  });
};

export const useGetInitialNotifications = () => {
  useEffect(() => {
    // When the app is not already running, and the user clicks on a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        storeNotification(response);
        return undefined;
      })
      .catch(sendError);

    // When the app is already running, and the user clicks on a notification
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener(storeNotification);

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};
