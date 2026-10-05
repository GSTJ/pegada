import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import { getNotificationResponseId } from "./notificationResponseState";

export enum NotificationUrl {
  Match = "match/",
  Chat = "chat/",
}

export const getNotificationUrl = (
  response: Notifications.NotificationResponse,
): string | undefined => {
  return response.notification.request.content.data?.url as string | undefined;
};

export const clearLastNotificationResponseIfMatching = async (responseId: string) => {
  const lastResponse = await Notifications.getLastNotificationResponseAsync();

  // Never clear a newer response that arrived while this intent was handled.
  if (!lastResponse || getNotificationResponseId(lastResponse) !== responseId) return;

  Notifications.clearLastNotificationResponse();
};

const handleUnknownNotification = (url: string) => {
  sendError(new Error(`Unknown notification: ${url}`));
};

const handleMatchNotification = async (matchId: string, dogId: string) => {
  return router.navigate({
    pathname: SceneName.NewMatch,
    params: { matchDogId: dogId, matchId: matchId },
  });
};

const handleChatNotification = async (matchId: string, dogId: string) => {
  return router.navigate({
    pathname: `${SceneName.Chat}/[matchId]`,
    params: { dogId, matchId },
  });
};

export const customNotificationHandler = async (url?: string) => {
  if (!url) return;

  if (url.startsWith(NotificationUrl.Match)) {
    const data = url.replace(NotificationUrl.Match, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) {
      handleUnknownNotification(url);
      return;
    }

    return handleMatchNotification(matchId, dogId);
  }

  if (url.startsWith(NotificationUrl.Chat)) {
    const data = url.replace(NotificationUrl.Chat, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) {
      handleUnknownNotification(url);
      return;
    }

    return handleChatNotification(matchId, dogId);
  }

  handleUnknownNotification(url);
};
