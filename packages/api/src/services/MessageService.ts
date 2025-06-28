import prisma from "@pegada/database";
import { Language } from "@pegada/shared/i18n/types/types";

import { PushNotificationService } from "./PushNotificationService";
import { TranslationService } from "./TranslationService";

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
    limit = this.#defaultLimit
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
        OR: [{ senderId: dogId }, { receiverId: dogId }]
      },
      take: limit,
      orderBy: { createdAt: "desc" }
    });

    return messages;
  }

  async sendMessage(content: string, senderId: string, matchId: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId, deletedAt: null }
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
        matchId
      },
      include: {
        sender: {
          select: {
            name: true,
            images: true
          }
        },
        receiver: {
          select: {
            name: true,
            user: {
              select: {
                id: true,
                pushToken: true
              }
            }
          }
        }
      }
    });

    const otherDog = newMessage.receiver;

    if (otherDog.user.pushToken) {
      await PushNotificationService.enqueuePushNotification({
        to: otherDog.user.pushToken,
        body: content,
        title: TranslationService.translate(
          "server:notification.message.title",
          { lng: this.language, replace: { name: newMessage.sender.name } }
        ),
        data: {
          url: `chat/${matchId}/${newMessage.senderId}`
        }
      });
    }

    return newMessage;
  }

  static async deleteMessage(messageId: string, senderId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId, deletedAt: null }
    });

    if (!message || message.senderId !== senderId) {
      throw new Error(
        "Invalid messageId or the sender is not the owner of the message"
      );
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });
  }
}

export default MessageService;
