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
import { handleReplyAction, isReplyAction } from "./handlers/reply";

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
      // The "Reply" action is already handled by the root listener in
      // `useGetInitialNotifications` - skip it here so we don't send the
      // message twice or navigate into the chat the user didn't tap into.
      if (isReplyAction(response)) return;

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

        // A reply typed on a killed app only ever surfaces here. Native buffers
        // the launch response and replays it into the module the moment it is
        // created, which is before any JS listener exists, so the emitted event
        // goes nowhere and only `lastResponse` survives (see
        // NotificationCenterManager.pendingResponses on iOS and
        // NotificationManager's listener replay on Android). Sending from the
        // listener alone silently dropped the message.
        // Returned rather than chained: the outer `.catch` below is the one
        // error path, and a nested `.catch` here is a second one nobody reads.
        if (isReplyAction(response)) return handleReplyAction(response);

        const url = getNotificationUrl(response);
        setInitialNotification(url);
        return undefined;
      })
      .catch(sendError);

    // Registered here (root, mounted for the whole app lifetime) rather
    // than in `processLinks`, so the "Reply" action on a chat-message push
    // is handled even if the user never navigates to the Swipe screen.
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        if (isReplyAction(response)) {
          handleReplyAction(response).catch(sendError);
          return;
        }

        const url = getNotificationUrl(response);
        setInitialNotification(url);
      });

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};
