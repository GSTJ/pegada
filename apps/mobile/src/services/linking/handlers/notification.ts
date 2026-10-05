import * as Notifications from "expo-notifications";
import { router } from "expo-router";

import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import { getNotificationResponseId } from "./notificationResponseState";

export enum NotificationUrl {
  Match = "match/",
  Chat = "chat/",
}

type ParsedNotificationUrl = {
  type: NotificationUrl;
  matchId: string;
  dogId: string;
};

export const getNotificationUrl = (
  response: Notifications.NotificationResponse,
): string | undefined => {
  const url = response.notification.request.content.data?.url;
  return typeof url === "string" ? url : undefined;
};

export const clearLastNotificationResponseIfMatching = async (responseId: string) => {
  const lastResponse = await Notifications.getLastNotificationResponseAsync();

  // Never clear a newer response that arrived while this intent was handled.
  if (!lastResponse || getNotificationResponseId(lastResponse) !== responseId) return;

  Notifications.clearLastNotificationResponse();
};

export const parseNotificationUrl = (url?: string): ParsedNotificationUrl | undefined => {
  if (!url) return undefined;

  const [type, matchId, dogId, ...extraParts] = url.split("/");
  if (!matchId || !dogId || extraParts.length > 0) return undefined;

  if (`${type}/` === NotificationUrl.Match) {
    return { type: NotificationUrl.Match, matchId, dogId };
  }

  if (`${type}/` === NotificationUrl.Chat) {
    return { type: NotificationUrl.Chat, matchId, dogId };
  }

  return undefined;
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

  const parsedUrl = parseNotificationUrl(url);
  if (!parsedUrl) {
    handleUnknownNotification(url);
    return;
  }

  if (parsedUrl.type === NotificationUrl.Match) {
    return handleMatchNotification(parsedUrl.matchId, parsedUrl.dogId);
  }

  if (parsedUrl.type === NotificationUrl.Chat) {
    return handleChatNotification(parsedUrl.matchId, parsedUrl.dogId);
  }
};
