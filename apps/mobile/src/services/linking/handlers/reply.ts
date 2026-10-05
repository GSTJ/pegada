import * as Notifications from "expo-notifications";

import { showStatusToast } from "@/components/StatusToast";
import { getTrcpContext } from "@/contexts/trcpContext";
import i18n from "@/i18n";
import { sendError } from "@/services/errorTracking";
import { NotificationAction, NotificationCategory } from "@/services/getPushNotificationToken";
import {
  clearLastNotificationResponseIfMatching,
  getNotificationUrl,
  NotificationUrl,
  parseNotificationUrl,
} from "./notification";
import {
  areNotificationResponsesEnabled,
  getNotificationReplyClientMessageId,
  getNotificationResponseId,
  queuePendingReplyAction,
  takePendingReplyActions,
} from "./notificationResponseState";

const handledReplyResponseIds = new Set<string>();
const inFlightReplyActions = new Map<string, Promise<ReplyActionResult>>();
const MAX_HANDLED_REPLY_RESPONSES = 100;

export enum ReplyActionResult {
  Sent = "sent",
  Queued = "queued",
  Duplicate = "duplicate",
  Invalid = "invalid",
}

const rememberHandledReplyResponse = (responseId: string) => {
  handledReplyResponseIds.add(responseId);

  if (handledReplyResponseIds.size <= MAX_HANDLED_REPLY_RESPONSES) return;

  const oldestResponseId = handledReplyResponseIds.values().next().value;
  if (oldestResponseId) handledReplyResponseIds.delete(oldestResponseId);
};

const getMatchIdFromUrl = (url?: string): string | undefined => {
  const parsedUrl = parseNotificationUrl(url);
  return parsedUrl?.type === NotificationUrl.Chat ? parsedUrl.matchId : undefined;
};

export const isReplyAction = (response: Notifications.NotificationResponse) => {
  const category = response.notification.request.content.categoryIdentifier;

  return (
    response.actionIdentifier === NotificationAction.Reply &&
    category === NotificationCategory.ChatMessage
  );
};

const cleanUpHandledReply = async (
  response: Notifications.NotificationResponse,
  responseId: string,
) => {
  await clearLastNotificationResponseIfMatching(responseId).catch(sendError);
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(
    sendError,
  );
};

/**
 * Sends a notification text reply through the same tRPC mutation as Chat.
 * The stable client message ID makes native response replay safe even after
 * process death; the server returns the original row without pushing twice.
 */
export const handleReplyAction = async (response: Notifications.NotificationResponse) => {
  const responseId = getNotificationResponseId(response);
  if (handledReplyResponseIds.has(responseId)) return ReplyActionResult.Duplicate;

  const existingRequest = inFlightReplyActions.get(responseId);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const content = response.userText?.trim();
    const matchId = getMatchIdFromUrl(getNotificationUrl(response));

    if (!content || !matchId) {
      sendError(new Error("Invalid reply notification: missing content or matchId"));
      showStatusToast(i18n.t("chat.replyFailed"), "error");
      rememberHandledReplyResponse(responseId);
      await cleanUpHandledReply(response, responseId);
      return ReplyActionResult.Invalid;
    }

    try {
      await getTrcpContext().client.message.send.mutate({
        matchId,
        content,
        clientMessageId: getNotificationReplyClientMessageId(matchId, response),
      });
    } catch (error) {
      showStatusToast(i18n.t("chat.replyFailed"), "error");
      throw error;
    }

    rememberHandledReplyResponse(responseId);
    await cleanUpHandledReply(response, responseId);
    showStatusToast(i18n.t("chat.replySent"), "success");
    return ReplyActionResult.Sent;
  })();

  inFlightReplyActions.set(responseId, request);

  try {
    return await request;
  } finally {
    inFlightReplyActions.delete(responseId);
  }
};

export const routeReplyAction = (response: Notifications.NotificationResponse) => {
  if (!areNotificationResponsesEnabled()) {
    queuePendingReplyAction(response);
    return Promise.resolve(ReplyActionResult.Queued);
  }

  return handleReplyAction(response);
};

export const flushPendingReplyActions = async () => {
  const responses = takePendingReplyActions();

  for (const [index, response] of responses.entries()) {
    try {
      // Replies are authored actions. Preserve their order when several were
      // queued while authentication resolved.
      // eslint-disable-next-line no-await-in-loop
      await handleReplyAction(response);
    } catch (error) {
      // Preserve this response and every response behind it for the next
      // authenticated linking mount.
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
  await cleanUpHandledReply(response, responseId);
};

export const discardPendingReplyActions = async () => {
  await Promise.all(takePendingReplyActions().map(discardReplyAction));
};
