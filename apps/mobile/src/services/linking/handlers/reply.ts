import * as Notifications from "expo-notifications";

import { NOTIFICATION_ACTION, NOTIFICATION_CATEGORY } from "@pegada/shared/constants/notifications";

import { getTrcpContext } from "@/contexts/trcp-context";
import i18n from "@/i18n";
import { sendError } from "@/services/error-tracking";
import { getNotificationUrl, NotificationUrl } from "./notification";

// Chat-message pushes carry `chat/<matchId>/<dogId>` in `data.url` (see
// MessageService, server-side). Reused here to know which match the
// "Reply" text-input action should send to.
export const getMatchIdFromUrl = (url?: string): string | undefined => {
  if (!url?.startsWith(NotificationUrl.Chat)) return undefined;

  const [matchId] = url.replace(NotificationUrl.Chat, "").split("/");
  return matchId;
};

export const isReplyAction = (response: Notifications.NotificationResponse) => {
  const category = response.notification.request.content.categoryIdentifier;

  return (
    response.actionIdentifier === NOTIFICATION_ACTION.Reply &&
    category === NOTIFICATION_CATEGORY.ChatMessage
  );
};

// Submitting the reply dismisses the notification, so a failed send would
// otherwise disappear without the user ever knowing. The in-app composer marks
// the bubble as failed for the same reason; off-screen, a notification is the
// only channel left.
const warnReplyFailed = () =>
  Notifications.scheduleNotificationAsync({
    content: { title: i18n.t("chat.replyFailed"), sound: false },
    trigger: null,
  });

/**
 * Handles the "Reply" text-input action on a chat-message notification by
 * sending the typed text through the same tRPC mutation the Chat screen
 * uses, so it works without that screen being mounted.
 *
 * Called from `useGetInitialNotifications` for both a live response and the
 * cold-launch one. If the app was killed, `opensAppToForeground` (default true
 * on the action) brings it to the foreground first so this can run; there is no
 * reliable way with expo-notifications alone to send the reply without that.
 */
export const handleReplyAction = async (response: Notifications.NotificationResponse) => {
  const content = response.userText?.trim();
  const url = getNotificationUrl(response);
  const matchId = getMatchIdFromUrl(url);

  if (!content || !matchId) {
    sendError(new Error("Invalid reply notification: missing content or matchId"));
    return;
  }

  try {
    await getTrcpContext().client.message.send.mutate({ matchId, content });
  } catch (error) {
    sendError(error);
    await warnReplyFailed();
  }
};
