import type { Language } from "@pegada/shared/i18n/types/types";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";

import { captureEvent } from "../shared/analytics";
import { PushNotificationService } from "./push-notification-service";
import { TranslationService } from "./translation-service";

class MessageService {
  // Default pagination settings
  static #defaultLimit: number | undefined = undefined;

  language?: Language;

  constructor(props: { language?: Language }) {
    this.language = props.language;
  }

  static async getMessages({
    matchId,
    dogId,
    lt,
    gt,
    limit = this.#defaultLimit,
  }: {
    matchId: string;
    dogId: string;
    lt?: Date;
    gt?: Date;
    limit?: number;
  }) {
    const messages = await prisma.message.findMany({
      where: {
        matchId,
        deletedAt: null,
        ...((lt || gt) && { createdAt: { lt, gt } }),
        // Only messages sent or received by the dog, so the dog can't see messages from other matches
        OR: [{ senderId: dogId }, { receiverId: dogId }],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return messages;
  }

  async sendMessage(content: string, senderId: string, matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId, deletedAt: null },
    });

    if (
      !match ||
      (match.requesterId !== senderId && match.responderId !== senderId)
    ) {
      throw new Error("Invalid matchId or senderId");
    }

    const otherDogId =
      match.requesterId === senderId ? match.responderId : match.requesterId;

    const newMessage = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId: otherDogId,
        matchId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        deletedAt: true,
        senderId: true,
        receiverId: true,
        matchId: true,
        sender: {
          select: {
            name: true,
            // Message.senderId is a Dog id; PostHog needs the person behind it.
            user: { select: { id: true } },
          },
        },
        receiver: {
          select: {
            name: true,
            user: {
              select: {
                id: true,
                pushToken: true,
              },
            },
          },
        },
      },
    });

    // The server's own copy of the app's "Message Sent". The app's can be lost
    // to a killed process between the mutation resolving and the event
    // flushing; this one cannot, which is what makes chat activation countable.
    captureEvent(newMessage.sender.user.id, ANALYTICS_EVENTS.MESSAGE_SENT, {
      match_id: matchId,
      message_type: "text",
    });

    const otherDog = newMessage.receiver;

    if (otherDog.user.pushToken) {
      await PushNotificationService.enqueuePushNotification({
        to: otherDog.user.pushToken,
        body: content,
        title: TranslationService.translate(
          "server:notification.message.title",
          {
            lng: this.language,
            replace: { name: newMessage.sender.name },
          },
        ),
        data: {
          url: `chat/${matchId}/${newMessage.senderId}`,
        },
        userId: otherDog.user.id,
        pushKind: "message",
      });
    }

    // Relations are selected only for the notification above. Returning them
    // exposed the recipient's Expo token and every sender image to the client.
    const { receiver: _receiver, sender: _sender, ...message } = newMessage;
    return message;
  }

  /**
   * Soft-deletes a message the sender owns.
   *
   * `senderId` is a Dog id, not a User id — Message.senderId is a relation to
   * Dog (see schema.prisma), and `sendMessage` stores the sender's dog id.
   * Both ids are strings, so the arguments used to be trivially swappable at
   * the call site; taking a named object makes that a compile error.
   */
  static async deleteMessage({
    messageId,
    senderId,
  }: {
    messageId: string;
    senderId: string;
  }) {
    const message = await prisma.message.findUnique({
      where: { id: messageId, deletedAt: null },
    });

    if (!message || message.senderId !== senderId) {
      throw new Error(
        "Invalid messageId or the sender is not the owner of the message",
      );
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }
}

export default MessageService;
