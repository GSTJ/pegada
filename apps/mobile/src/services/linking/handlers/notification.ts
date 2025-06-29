import type { NotificationResponse } from "expo-notifications";
import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";

enum NotificationUrl {
  Match = "match/",
  Chat = "chat/"
}

export const getNotificationUrl = (
  response: NotificationResponse
): string | undefined => {
  const data = response.notification.request.content.data as { url?: string };
  return data.url;
};

const handleUnknownNotification = (url: string) => {
  sendError(new Error(`Unknown notification: ${url}`));
};

const handleMatchNotification = async (matchId: string, dogId: string) => {
  router.push({
    pathname: SceneName.NewMatch,
    params: { matchDogId: dogId, matchId: matchId }
  });
};

const handleChatNotification = async (matchId: string, dogId: string) => {
  router.push({
    pathname: `${SceneName.Chat}/[matchId]`,
    params: { dogId, matchId }
  });
};

export const customNotificationHandler = async (url?: string) => {
  if (!url) return;

  if (url.startsWith(NotificationUrl.Match)) {
    const data = url.replace(NotificationUrl.Match, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) throw new Error("Invalid notification url");

    return handleMatchNotification(matchId, dogId);
  }

  if (url.startsWith(NotificationUrl.Chat)) {
    const data = url.replace(NotificationUrl.Chat, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) throw new Error("Invalid notification url");

    return handleChatNotification(matchId, dogId);
  }

  handleUnknownNotification(url);
};
