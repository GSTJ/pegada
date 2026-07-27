/**
 * Shared between the push sender (packages/api's MessageService) and the app
 * that registers them (apps/mobile's getPushNotificationToken). A mismatch
 * costs the chat push its Reply action and its own Android channel, and
 * nothing fails loudly, so both sides read the ids from here.
 */
export const NOTIFICATION_CHANNEL = {
  ChatMessage: "messages",
} as const;

export const NOTIFICATION_CATEGORY = {
  ChatMessage: "chat-message",
} as const;

export const NOTIFICATION_ACTION = {
  Reply: "reply",
} as const;
