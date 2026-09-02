import type * as Notifications from "expo-notifications";

import { router } from "expo-router";

import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

enum NotificationUrl {
  Match = "match/",
  Chat = "chat/",
  Like = "like",
}

export const getNotificationUrl = (
  response: Notifications.NotificationResponse,
): string | undefined => {
  return response.notification.request.content.data?.url as string | undefined;
};

const handleUnknownNotification = (url: string) => {
  sendError(new Error(`Unknown notification: ${url}`));
};

const handleMatchNotification = (matchId: string, dogId: string) => {
  return router.push({
    pathname: SceneName.NewMatch,
    params: { matchDogId: dogId, matchId },
  });
};

const handleChatNotification = (matchId: string, dogId: string) => {
  return router.push({
    pathname: `${SceneName.Chat}/[matchId]`,
    params: { dogId, matchId },
  });
};

/**
 * A received like has no screen of its own: the dog that liked us stays hidden
 * until we like them back, so the tap lands on the deck where that can happen.
 */
const handleLikeNotification = () => {
  return router.push(SceneName.Swipe);
};

export const customNotificationHandler = (url?: string) => {
  if (!url) return;

  if (url.startsWith(NotificationUrl.Match)) {
    const data = url.replace(NotificationUrl.Match, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) throw new Error("Invalid notification url");

    return handleMatchNotification(matchId, dogId);
  }

  if (url === NotificationUrl.Like) {
    return handleLikeNotification();
  }

  if (url.startsWith(NotificationUrl.Chat)) {
    const data = url.replace(NotificationUrl.Chat, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) throw new Error("Invalid notification url");

    return handleChatNotification(matchId, dogId);
  }

  handleUnknownNotification(url);
};
