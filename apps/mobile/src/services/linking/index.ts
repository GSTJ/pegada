import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { sendError } from "@/services/errorTracking";
import {
  initialNotification,
  setInitialNotification
} from "./handlers/initialNotification";
import {
  customNotificationHandler,
  getNotificationUrl
} from "./handlers/notification";

export const processLinks = () => {
  if (initialNotification) {
    customNotificationHandler(initialNotification).catch(sendError);
  }

  setInitialNotification(undefined);

  // When the app is already running, and the user clicks on a notification
  const notificationSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const url = getNotificationUrl(response);
      customNotificationHandler(url).catch(sendError);
    });

  return {
    remove: () => {
      notificationSubscription.remove();
    }
  };
};

export const useGetInitialNotifications = () => {
  useEffect(() => {
    // When the app is not already running, and the user clicks on a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const url = getNotificationUrl(response);
        setInitialNotification(url);
      })
      .catch(sendError);

    // When the app is already running, and the user clicks on a notification
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const url = getNotificationUrl(response);
        setInitialNotification(url);
      });

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};
