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

  async sendMessage(content: string, senderId: string, matchId: string, clientMessageId?: string) {
    const match = await prisma.match.findUnique({
      where: { id: matchId, deletedAt: null },
    });

    if (!match || (match.requesterId !== senderId && match.responderId !== senderId)) {
      throw new Error("Invalid matchId or senderId");
    }

    const otherDogId = match.requesterId === senderId ? match.responderId : match.requesterId;

    const data = {
      content,
      senderId,
      receiverId: otherDogId,
      matchId,
    };
    const include = {
      sender: {
        select: {
          name: true,
          images: true,
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
    } as const;

    let created = true;
    const newMessage = clientMessageId
      ? await (async () => {
          const result = await prisma.message.createMany({
            data: { id: clientMessageId, ...data },
            skipDuplicates: true,
          });
          created = result.count === 1;

          const message = await prisma.message.findUnique({
            where: { id: clientMessageId },
            include,
          });

          if (
            !message ||
            message.content !== content ||
            message.senderId !== senderId ||
            message.receiverId !== otherDogId ||
            message.matchId !== matchId
          ) {
            throw new Error("Invalid clientMessageId");
          }

          return message;
        })()
      : await prisma.message.create({ data, include });

    // A notification response can be delivered again after a process death.
    // Return the original message without notifying the receiver twice.
    if (!created) return newMessage;

    const otherDog = newMessage.receiver;

    if (otherDog.user.pushToken) {
      await PushNotificationService.enqueuePushNotification({
        to: otherDog.user.pushToken,
        body: content,
        title: TranslationService.translate("server:notification.message.title", {
          lng: this.language,
          replace: { name: newMessage.sender.name },
        }),
        channelId: "messages",
        categoryId: "chat-message",
        data: {
          url: `chat/${matchId}/${newMessage.senderId}`,
        },
      });
    }

    return newMessage;
  }

  static async deleteMessage(messageId: string, senderId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId, deletedAt: null },
    });

    if (!message || message.senderId !== senderId) {
      throw new Error("Invalid messageId or the sender is not the owner of the message");
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }
}

export default MessageService;
