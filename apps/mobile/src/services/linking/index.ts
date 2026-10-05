import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";

import { sendError } from "@/services/errorTracking";
import { initialNotification, setInitialNotification } from "./handlers/initialNotification";
import {
  clearLastNotificationResponseIfMatching,
  customNotificationHandler,
  getNotificationUrl,
} from "./handlers/notification";
import {
  areNotificationResponsesEnabled,
  getNotificationResponseId,
  setNotificationResponsesEnabled,
} from "./handlers/notificationResponseState";
import {
  discardPendingReplyActions,
  discardReplyAction,
  flushPendingReplyActions,
  isReplyAction,
  routeReplyAction,
} from "./handlers/reply";

const handledNavigationResponseIds = new Set<string>();
const inFlightNavigationResponses = new Map<string, Promise<void>>();
const MAX_HANDLED_NAVIGATION_RESPONSES = 100;

const rememberHandledNavigationResponse = (responseId: string) => {
  handledNavigationResponseIds.add(responseId);

  if (handledNavigationResponseIds.size <= MAX_HANDLED_NAVIGATION_RESPONSES) return;

  const oldestResponseId = handledNavigationResponseIds.values().next().value;
  if (oldestResponseId) handledNavigationResponseIds.delete(oldestResponseId);
};

const handleNavigationResponse = async (response: Notifications.NotificationResponse) => {
  const responseId = getNotificationResponseId(response);
  if (handledNavigationResponseIds.has(responseId)) return;

  const existingRequest = inFlightNavigationResponses.get(responseId);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    await customNotificationHandler(getNotificationUrl(response));
    rememberHandledNavigationResponse(responseId);
    await clearLastNotificationResponseIfMatching(responseId).catch(sendError);
  })();

  inFlightNavigationResponses.set(responseId, request);

  try {
    await request;
  } finally {
    inFlightNavigationResponses.delete(responseId);
  }
};

const discardNavigationResponse = async (response: Notifications.NotificationResponse) => {
  const responseId = getNotificationResponseId(response);
  rememberHandledNavigationResponse(responseId);
  await clearLastNotificationResponseIfMatching(responseId).catch(sendError);
};

const routeNavigationResponse = (response: Notifications.NotificationResponse) => {
  if (!areNotificationResponsesEnabled()) {
    // Navigation is destination state. If several taps arrive before
    // authentication resolves, the latest destination wins.
    setInitialNotification(response);
    return Promise.resolve();
  }

  return handleNavigationResponse(response);
};

export const processLinks = () => {
  setNotificationResponsesEnabled(true);
  flushPendingReplyActions().catch(sendError);

  if (initialNotification) {
    handleNavigationResponse(initialNotification).catch(sendError);
  }

  setInitialNotification(undefined);

  return {
    remove: () => {
      setNotificationResponsesEnabled(false);
    },
  };
};

/**
 * `notificationResponsesAllowed` stays unresolved during boot, becomes true
 * only for a fully authenticated session, and becomes false on signed-out or
 * onboarding routes. Private replies and destinations never cross accounts.
 */
export const useGetInitialNotifications = (notificationResponsesAllowed?: boolean) => {
  const notificationResponsesAllowedRef = useRef(notificationResponsesAllowed);
  notificationResponsesAllowedRef.current = notificationResponsesAllowed;

  useEffect(() => {
    if (notificationResponsesAllowed !== false) return;

    discardPendingReplyActions().catch(sendError);

    if (initialNotification) {
      discardNavigationResponse(initialNotification).catch(sendError);
      setInitialNotification(undefined);
    }
  }, [notificationResponsesAllowed]);

  useEffect(() => {
    let latestLiveResponseId: string | undefined;

    const processInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return;

      // The initial-response promise can resolve after a newer listener event.
      // Keep the newer action authoritative. Duplicate delivery of the same
      // response is coalesced by its response ID.
      if (latestLiveResponseId && latestLiveResponseId !== getNotificationResponseId(response)) {
        return;
      }

      if (isReplyAction(response)) {
        if (notificationResponsesAllowedRef.current === false) {
          await discardReplyAction(response);
          return;
        }

        await routeReplyAction(response);
        return;
      }

      if (notificationResponsesAllowedRef.current === false) {
        await discardNavigationResponse(response);
        return;
      }

      await routeNavigationResponse(response);
    };

    processInitialNotification().catch(sendError);

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        latestLiveResponseId = getNotificationResponseId(response);

        if (isReplyAction(response)) {
          if (notificationResponsesAllowedRef.current === false) {
            discardReplyAction(response).catch(sendError);
            return;
          }

          routeReplyAction(response).catch(sendError);
          return;
        }

        if (notificationResponsesAllowedRef.current === false) {
          discardNavigationResponse(response).catch(sendError);
          return;
        }

        routeNavigationResponse(response).catch(sendError);
      },
    );

    return () => {
      notificationSubscription.remove();
    };
  }, []);
};
