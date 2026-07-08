import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { sendError } from "@/services/errorTracking";
import { initialNotification, setInitialNotification } from "./handlers/initialNotification";
import { customNotificationHandler, getNotificationUrl } from "./handlers/notification";
import { handleReplyAction, isReplyAction } from "./handlers/reply";

export const processLinks = () => {
  if (initialNotification) {
    customNotificationHandler(initialNotification).catch(sendError);
  }

  setInitialNotification(undefined);

  // When the app is already running, and the user clicks on a notification
  const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      // The "Reply" action is already handled by the root listener in
      // `useGetInitialNotifications` - skip it here so we don't send the
      // message twice or navigate into the chat the user didn't tap into.
      if (isReplyAction(response)) return;

      const url = getNotificationUrl(response);
      customNotificationHandler(url).catch(sendError);
    },
  );

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
      })
      .catch(sendError);

    // Registered here (root, mounted for the whole app lifetime) rather
    // than in `processLinks`, so the "Reply" action on a chat-message push
    // is handled even if the user never navigates to the Swipe screen.
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (isReplyAction(response)) {
          handleReplyAction(response).catch(sendError);
          return;
        }

        const url = getNotificationUrl(response);
        setInitialNotification(url);
      },
    );

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};
