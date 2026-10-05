import type * as Notifications from "expo-notifications";

const pendingReplyActions = new Map<string, Notifications.NotificationResponse>();
let notificationResponsesEnabled = false;

export const getNotificationResponseId = (response: Notifications.NotificationResponse) => {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
};

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
