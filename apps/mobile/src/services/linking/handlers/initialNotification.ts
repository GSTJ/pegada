import type * as Notifications from "expo-notifications";

export let initialNotification: Notifications.NotificationResponse | undefined;

export const setInitialNotification = (response?: Notifications.NotificationResponse) => {
  initialNotification = response;
};
