import * as Notifications from "expo-notifications";
import * as uuid from "uuid";

import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { NotificationAction, NotificationCategory } from "@/services/getPushNotificationToken";
import {
  clearLastNotificationResponseIfMatching,
  getNotificationUrl,
  NotificationUrl,
} from "./notification";
import {
  areNotificationResponsesEnabled,
  getNotificationResponseId,
  queuePendingReplyAction,
  takePendingReplyActions,
} from "./notificationResponseState";

// A cold start can expose the same native response through both the initial
// response API and the live listener. Share the in-flight promise, then retain
// a bounded history of successful response IDs so both deliveries send once.
const handledReplyResponseIds = new Set<string>();
const inFlightReplyActions = new Map<string, Promise<void>>();
const MAX_HANDLED_REPLY_RESPONSES = 100;

const rememberHandledReplyResponse = (responseId: string) => {
  handledReplyResponseIds.add(responseId);

  if (handledReplyResponseIds.size <= MAX_HANDLED_REPLY_RESPONSES) return;

  const oldestResponseId = handledReplyResponseIds.values().next().value;
  if (oldestResponseId) handledReplyResponseIds.delete(oldestResponseId);
};

// Chat-message pushes carry `chat/<matchId>/<dogId>` in `data.url` (see
// MessageService, server-side). Reused here to know which match the
// "Reply" text-input action should send to.
const getMatchIdFromUrl = (url?: string): string | undefined => {
  if (!url?.startsWith(NotificationUrl.Chat)) return undefined;

  const [matchId] = url.replace(NotificationUrl.Chat, "").split("/");
  return matchId;
};

export const isReplyAction = (response: Notifications.NotificationResponse) => {
  const category = response.notification.request.content.categoryIdentifier;

  return (
    response.actionIdentifier === NotificationAction.Reply &&
    category === NotificationCategory.ChatMessage
  );
};

/**
 * Handles the "Reply" text-input action on a chat-message notification by
 * sending the typed text through the same tRPC mutation the Chat screen
 * uses, so it works without that screen being mounted.
 *
 * Fires for foreground and backgrounded apps. If the app was killed,
 * `opensAppToForeground` (default true on the action) brings it to the
 * foreground first so this listener can run - there is no reliable way
 * with expo-notifications alone to send the reply without doing that.
 */
export const handleReplyAction = async (response: Notifications.NotificationResponse) => {
  const responseId = getNotificationResponseId(response);
  if (handledReplyResponseIds.has(responseId)) return;

  const existingRequest = inFlightReplyActions.get(responseId);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const content = response.userText?.trim();
    const url = getNotificationUrl(response);
    const matchId = getMatchIdFromUrl(url);

    if (!content || !matchId) {
      sendError(new Error("Invalid reply notification: missing content or matchId"));
      rememberHandledReplyResponse(responseId);
      await clearLastNotificationResponseIfMatching(responseId);
      return;
    }

    await getTrcpContext().client.message.send.mutate({
      matchId,
      content,
      clientMessageId: uuid.v5(`pegada:notification-reply:${responseId}`, uuid.v5.URL),
    });
    rememberHandledReplyResponse(responseId);
    await clearLastNotificationResponseIfMatching(responseId);
  })();

  inFlightReplyActions.set(responseId, request);

  try {
    await request;
  } finally {
    inFlightReplyActions.delete(responseId);
  }
};

export const routeReplyAction = (response: Notifications.NotificationResponse) => {
  if (!areNotificationResponsesEnabled()) {
    queuePendingReplyAction(response);
    return Promise.resolve();
  }

  return handleReplyAction(response);
};

export const flushPendingReplyActions = async () => {
  const responses = takePendingReplyActions();

  for (const [index, response] of responses.entries()) {
    try {
      // Replies are user-authored messages. Preserve their action order even
      // when several were queued while authentication was resolving.
      // eslint-disable-next-line no-await-in-loop
      await handleReplyAction(response);
    } catch (error) {
      // Preserve the failed response and every response behind it for the
      // next authenticated linking mount. Never silently lose typed replies.
      for (const unhandledResponse of responses.slice(index)) {
        queuePendingReplyAction(unhandledResponse);
      }

      throw error;
    }
  }
};

export const discardReplyAction = async (response: Notifications.NotificationResponse) => {
  const responseId = getNotificationResponseId(response);
  rememberHandledReplyResponse(responseId);
  await clearLastNotificationResponseIfMatching(responseId);
};

export const discardPendingReplyActions = async () => {
  await Promise.all(takePendingReplyActions().map(discardReplyAction));
};
