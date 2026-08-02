import { useEffect } from "react";

import * as Notifications from "expo-notifications";

import { sendError } from "@/services/error-tracking";

import {
  getInitialNotification,
  setInitialNotification,
} from "./handlers/initial-notification";
import {
  customNotificationHandler,
  getNotificationUrl,
} from "./handlers/notification";

export const processLinks = () => {
  const initialNotification = getInitialNotification();

  if (initialNotification) {
    // The handler is synchronous — expo-router's push is — so a rejected
    // promise was never the failure mode here; a thrown "Invalid notification
    // url" was, and `.catch` never saw it.
    try {
      customNotificationHandler(initialNotification);
    } catch (error) {
      sendError(error);
    }
  }

  setInitialNotification(undefined);

  // When the app is already running, and the user clicks on a notification
  const notificationSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      const url = getNotificationUrl(response);
      try {
        customNotificationHandler(url);
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

export const useGetInitialNotifications = () => {
  useEffect(() => {
    // When the app is not already running, and the user clicks on a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const url = getNotificationUrl(response);
        setInitialNotification(url);
        return undefined;
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
