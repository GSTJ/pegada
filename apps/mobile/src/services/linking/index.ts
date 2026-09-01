import { useEffect } from "react";

import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

import {
  getInitialNotification,
  getInitialNotificationKind,
  setInitialNotification,
} from "./handlers/initial-notification";
import {
  customNotificationHandler,
  getNotificationKind,
  getNotificationUrl,
} from "./handlers/notification";
import {
  setPendingDogProfile,
  usePendingDogProfileId,
} from "./handlers/pending-dog-profile";

export const processLinks = () => {
  const initialNotification = getInitialNotification();

  if (initialNotification) {
    // The handler is synchronous — expo-router's push is — so a rejected
    // promise was never the failure mode here; a thrown "Invalid notification
    // url" was, and `.catch` never saw it.
    try {
      customNotificationHandler(
        initialNotification,
        getInitialNotificationKind(),
      );
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

export const useGetInitialNotifications = () => {
  useEffect(() => {
    // When the app is not already running, and the user clicks on a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        setInitialNotification(
          getNotificationUrl(response),
          getNotificationKind(response),
        );
        return undefined;
      })
      .catch(sendError);

    // When the app is already running, and the user clicks on a notification
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        setInitialNotification(
          getNotificationUrl(response),
          getNotificationKind(response),
        );
      });

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};

// A `/dog/<id>` link (see app/dog/[id].tsx) can arrive before authentication
// finishes, or while logged out entirely. `enabled` mirrors useQuickActions:
// it only goes true once the user has cleared auth + onboarding and landed
// on Swipe, so this never pushes a protected screen while logged out. Reads
// the id through the reactive `usePendingDogProfileId` rather than a one-off
// `getPendingDogProfile()` call, because a *warm* link sets it while
// `enabled` is already true — only the id itself changing drives the effect
// in that case; `enabled` never toggles again to do it.
export const usePendingDogProfile = (enabled: boolean) => {
  const pendingDogProfileId = usePendingDogProfileId();

  useEffect(() => {
    if (!enabled || !pendingDogProfileId) return;

    setPendingDogProfile(undefined);
    router.push({
      pathname: `${SceneName.Profile}/[id]`,
      params: { id: pendingDogProfileId },
    });
  }, [enabled, pendingDogProfileId]);
};
