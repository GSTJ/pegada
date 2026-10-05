import type * as Notifications from "expo-notifications";
import * as uuid from "uuid";

const pendingReplyActions = new Map<string, Notifications.NotificationResponse>();
let notificationResponsesEnabled = false;

export const getNotificationResponseId = (response: Notifications.NotificationResponse) => {
  // A user can retry the text-input action on the same notification after a
  // transient failure. The trimmed reply distinguishes a genuinely new
  // message while native replay of the same authored text stays exact-once.
  return JSON.stringify([
    response.notification.request.identifier,
    response.actionIdentifier,
    response.userText?.trim() ?? null,
  ]);
};

export const getNotificationReplyClientMessageId = (
  matchId: string,
  response: Notifications.NotificationResponse,
) =>
  uuid.v5(
    `pegada:notification-reply:${matchId}:${getNotificationResponseId(response)}`,
    uuid.v5.URL,
  );

export const areNotificationResponsesEnabled = () => notificationResponsesEnabled;

export const setNotificationResponsesEnabled = (enabled: boolean) => {
  notificationResponsesEnabled = enabled;
};

export const queuePendingReplyAction = (response: Notifications.NotificationResponse) => {
  pendingReplyActions.set(getNotificationResponseId(response), response);
};

export const takePendingReplyActions = () => {
  const responses = [...pendingReplyActions.values()];
  pendingReplyActions.clear();
  return responses;
};

export const clearPendingReplyActions = () => {
  pendingReplyActions.clear();
  notificationResponsesEnabled = false;
};
