import { useEffect } from "react";

import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

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
import {
  setPendingDogProfile,
  usePendingDogProfileId,
} from "./handlers/pending-dog-profile";

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

export const useGetInitialNotifications = () => {
  useEffect(() => {
    // When the app is not already running, and the user clicks on a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        setInitialNotification({
          id: getNotificationId(response),
          url: getNotificationUrl(response),
          kind: getNotificationKind(response),
        });
        return undefined;
      })
      .catch(sendError);

    // When the app is already running, and the user clicks on a notification
    const notificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        setInitialNotification({
          id: getNotificationId(response),
          url: getNotificationUrl(response),
          kind: getNotificationKind(response),
        });
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
    // Last step of the funnel started by "Dog Link Opened": the shared
    // profile is actually on screen. Everything between the two steps (sign
    // in, onboarding, create profile) shows up as the drop off.
    analytics.track({ event_type: "Dog Link Profile Opened" });
    router.push({
      pathname: `${SceneName.Profile}/[id]`,
      params: { id: pendingDogProfileId },
    });
  }, [enabled, pendingDogProfileId]);
};
