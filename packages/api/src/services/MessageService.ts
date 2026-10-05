import prisma from "@pegada/database";
import { Language } from "@pegada/shared/i18n/types/types";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { config } from "../shared/config";
import { PushNotificationService } from "./PushNotificationService";
import { TranslationService } from "./TranslationService";

const PUSH_PREVIEW_CODE_POINTS = 400;
const MAX_PUSH_AVATAR_URL_BYTES = 1_024;

const getPushPreview = (content: string) => {
  const codePoints = [...content];
  if (codePoints.length <= PUSH_PREVIEW_CODE_POINTS) return content;

  return `${codePoints.slice(0, PUSH_PREVIEW_CODE_POINTS - 3).join("")}...`;
};

const pathIsWithin = (path: string, basePath: string) => {
  const normalizedBase = basePath.replace(/\/$/, "");
  return normalizedBase === "" || path === normalizedBase || path.startsWith(`${normalizedBase}/`);
};

/**
 * Communication-notification avatars are downloaded on the receiving device.
 * Only forward URLs issued by our configured public image storage so a profile
 * image cannot turn the notification extension into a request to an arbitrary
 * HTTPS host.
 */
const isTrustedPushAvatarUrl = (value: string) => {
  if (Buffer.byteLength(value, "utf8") > MAX_PUSH_AVATAR_URL_BYTES) return false;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== ""
    ) {
      return false;
    }

    if (config.PUBLIC_IMAGES_BASE_URL) {
      const publicBase = new URL(config.PUBLIC_IMAGES_BASE_URL);
      if (url.origin === publicBase.origin && pathIsWithin(url.pathname, publicBase.pathname)) {
        return true;
      }
    }

    // Shipped app versions still persist URLs from the legacy AWS upload
    // route. Accept only the two standard virtual-hosted S3 forms that route
    // to this configured bucket, never an arbitrary amazonaws.com subdomain.
    const legacyHosts = new Set([
      `${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`,
      `${config.AWS_S3_BUCKET_NAME}.s3.amazonaws.com`,
    ]);
    return url.port === "" && legacyHosts.has(url.hostname);
  } catch {
    return false;
  }
};

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
          // The first approved photo becomes the communication-notification
          // avatar. Rejected and pending photos never leave the server.
          images: {
            orderBy: { position: "asc" },
            where: { status: IMAGE_STATUS.APPROVED },
            take: 1,
            select: { url: true },
          },
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

    // Native notification responses can replay after a process death. Return
    // the original row without notifying the receiver a second time.
    if (!created) return newMessage;

    const otherDog = newMessage.receiver;

    if (otherDog.user.pushToken) {
      const avatarUrl = newMessage.sender.images[0]?.url;
      await PushNotificationService.enqueuePushNotification({
        to: otherDog.user.pushToken,
        // Expo/APNs caps the complete payload at roughly 4 KiB. Store the
        // full message, but keep its notification preview within that budget
        // after the avatar URL and routing data are included.
        body: getPushPreview(content),
        title: TranslationService.translate("server:notification.message.title", {
          lng: this.language,
          replace: { name: newMessage.sender.name },
        }),
        channelId: "messages",
        categoryId: "chat-message",
        // Lets the iOS Notification Service Extension intercept the push and
        // restyle it as a communication notification (sender avatar + name).
        mutableContent: true,
        data: {
          url: `chat/${matchId}/${newMessage.senderId}`,
          senderName: newMessage.sender.name,
          recipientId: newMessage.receiverId,
          recipientName: otherDog.name,
          ...(avatarUrl && isTrustedPushAvatarUrl(avatarUrl) && { senderAvatarUrl: avatarUrl }),
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
