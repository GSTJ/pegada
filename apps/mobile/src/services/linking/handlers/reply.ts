import * as Notifications from "expo-notifications";

import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { NotificationAction, NotificationCategory } from "@/services/getPushNotificationToken";
import { getNotificationUrl, NotificationUrl } from "./notification";

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
  const content = response.userText?.trim();
  const url = getNotificationUrl(response);
  const matchId = getMatchIdFromUrl(url);

  if (!content || !matchId) {
    sendError(new Error("Invalid reply notification: missing content or matchId"));
    return;
  }

  await getTrcpContext().client.message.send.mutate({ matchId, content });
};
