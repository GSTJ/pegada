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
    await clearLastNotificationResponseIfMatching(responseId);
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
  await clearLastNotificationResponseIfMatching(responseId);
};

const routeNavigationResponse = (response: Notifications.NotificationResponse) => {
  if (!areNotificationResponsesEnabled()) {
    // Navigation is destination state, not an event stream. If several taps
    // arrive before authentication resolves, the latest destination wins.
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
 * `notificationResponsesAllowed` is unresolved during boot, true only for a fully
 * authenticated and onboarded session, and false for every signed-out or
 * onboarding route. This keeps a reply or private destination from leaking
 * into another account if authentication resolves after a push wakes the app.
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

    // When the app is not already running, and the user clicks on a notification
    const processInitialNotification = async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return;

      // The initial-response promise can resolve after the listener receives
      // a newer tap. Keep the newer user intent authoritative; processing the
      // same response twice is safe and coalesced by its response ID.
      if (latestLiveResponseId && latestLiveResponseId !== getNotificationResponseId(response)) {
        return;
      }

      // A reply action is a message-send intent, not a navigation intent.
      // Route it through the same deduplicated handler as the live listener
      // and never queue its chat URL for processLinks().
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

    // Registered here (root, mounted for the whole app lifetime) rather
    // than in `processLinks`, so the "Reply" action on a chat-message push
    // is handled even if the user never navigates to the Swipe screen.
    const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        latestLiveResponseId = getNotificationResponseId(response);

        if (isReplyAction(response)) {
          if (notificationResponsesAllowedRef.current === false) {
            // There should not normally be a chat push for a signed-out user,
            // but never retain its text until a different account signs in.
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
