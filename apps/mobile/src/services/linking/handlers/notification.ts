import type * as Notifications from "expo-notifications";

import { router } from "expo-router";

import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

enum NotificationUrl {
  Match = "match/",
  Chat = "chat/",
  Like = "like",
  Swipe = "swipe",
}

export const getNotificationUrl = (
  response: Notifications.NotificationResponse,
): string | undefined => {
  return response.notification.request.content.data?.url as string | undefined;
};

/**
 * Which scheduled nudge this push came from, when it came from one.
 *
 * Only the re-engagement cron sets it. Reactive pushes have no kind, and the
 * open is still reported for them, just without the breakdown.
 */
export const getNotificationKind = (
  response: Notifications.NotificationResponse,
): string | undefined => {
  return response.notification.request.content.data?.kind as string | undefined;
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
 * Both urls land on the deck. A received like has no screen of its own, since
 * the dog that liked us stays hidden until we like them back, and the "new dogs
 * nearby" nudge is about the deck itself.
 */
const handleDeckNotification = () => {
  return router.push(SceneName.Swipe);
};

export const customNotificationHandler = (url?: string, kind?: string) => {
  if (!url) return;

  // Both events fire from the same place because on this app they are the same
  // moment: every deep link the app handles arrives as a notification tap. The
  // pair is kept separate so a link opened from anywhere else later (a shared
  // dog page, an email) has somewhere to land without splitting push history.
  analytics.track({
    event_type: "Push Notification Opened",
    event_properties: { kind, url },
  });
  analytics.track({
    event_type: "Deep Link Opened",
    event_properties: { path: url.split("/")[0], url },
  });

  if (url.startsWith(NotificationUrl.Match)) {
    const data = url.replace(NotificationUrl.Match, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) throw new Error("Invalid notification url");

    return handleMatchNotification(matchId, dogId);
  }

  if (url === NotificationUrl.Like || url === NotificationUrl.Swipe) {
    return handleDeckNotification();
  }

  if (url.startsWith(NotificationUrl.Chat)) {
    const data = url.replace(NotificationUrl.Chat, "");
    const [matchId, dogId] = data.split("/");

    if (!matchId || !dogId) throw new Error("Invalid notification url");

    return handleChatNotification(matchId, dogId);
  }

  handleUnknownNotification(url);
};
