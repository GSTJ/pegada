import { Gender } from "@prisma/client";

import prisma from "@pegada/database";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { config } from "../shared/config";
import MessageService from "./MessageService";
import { PushNotificationService } from "./PushNotificationService";

const trustedImageUrl = (fileName: string) =>
  `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com/dogs/${fileName}`;
const CLIENT_MESSAGE_ID = "02f3f5d6-786c-5e77-a57f-9fcf6bfc36b1";

afterAll(async () => {
  await prisma.$disconnect();
});

afterEach(() => {
  jest.restoreAllMocks();
});

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.match.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

const createMatch = async (withPushToken = false) => {
  const users = await Promise.all(
    ["requester", "responder"].map((name) =>
      prisma.user.create({
        data: {
          email: `${name}@message-service.test`,
          pushToken: withPushToken && name === "responder" ? "ExponentPushToken[test]" : undefined,
          dogs: { create: { name, gender: Gender.MALE } },
        },
        include: { dogs: true },
      }),
    ),
  );
  const requester = users[0]!;
  const responder = users[1]!;
  const requesterDog = requester.dogs[0]!;
  const responderDog = responder.dogs[0]!;
  const match = await prisma.match.create({
    data: { requesterId: requesterDog.id, responderId: responderDog.id },
  });

  return { match, requesterDog, responderDog };
};

describe("MessageService.sendMessage", () => {
  test("creates one message and one push for concurrent requests with the same client ID", async () => {
    const { match, requesterDog } = await createMatch(true);
    const messageService = new MessageService({});
    const pushSpy = jest
      .spyOn(PushNotificationService, "enqueuePushNotification")
      .mockResolvedValue(undefined);

    const messages = await Promise.all([
      messageService.sendMessage("hello", requesterDog.id, match.id, CLIENT_MESSAGE_ID),
      messageService.sendMessage("hello", requesterDog.id, match.id, CLIENT_MESSAGE_ID),
    ]);

    expect(messages[0].id).toBe(CLIENT_MESSAGE_ID);
    expect(messages[1].id).toBe(messages[0].id);
    await expect(prisma.message.count()).resolves.toBe(1);
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(pushSpy.mock.calls[0]?.[0].data).not.toHaveProperty("senderAvatarUrl");
  });

  test("rejects reusing a client ID for different message data", async () => {
    const { match, requesterDog } = await createMatch();
    const messageService = new MessageService({});

    await messageService.sendMessage("hello", requesterDog.id, match.id, CLIENT_MESSAGE_ID);

    await expect(
      messageService.sendMessage("different", requesterDog.id, match.id, CLIENT_MESSAGE_ID),
    ).rejects.toThrow("Invalid clientMessageId");
    await expect(prisma.message.count()).resolves.toBe(1);
  });

  test("sends only the first approved sender photo to the communication notification", async () => {
    const { match, requesterDog, responderDog } = await createMatch(true);
    await prisma.image.createMany({
      data: [
        {
          dogId: requesterDog.id,
          position: 0,
          status: IMAGE_STATUS.REJECTED,
          url: trustedImageUrl("rejected.webp"),
        },
        {
          dogId: requesterDog.id,
          position: 2,
          status: IMAGE_STATUS.APPROVED,
          url: trustedImageUrl("second.webp"),
        },
        {
          dogId: requesterDog.id,
          position: 1,
          status: IMAGE_STATUS.APPROVED,
          url: trustedImageUrl("avatar.webp"),
        },
      ],
    });
    const pushSpy = jest
      .spyOn(PushNotificationService, "enqueuePushNotification")
      .mockResolvedValue(undefined);

    await new MessageService({}).sendMessage("hello", requesterDog.id, match.id);

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "chat-message",
        channelId: "messages",
        mutableContent: true,
        data: {
          recipientId: responderDog.id,
          recipientName: "responder",
          senderAvatarUrl: trustedImageUrl("avatar.webp"),
          senderName: "requester",
          url: `chat/${match.id}/${requesterDog.id}`,
        },
      }),
    );
  });

  test("bounds long notification previews without truncating the stored message", async () => {
    const { match, requesterDog } = await createMatch(true);
    await prisma.image.create({
      data: {
        dogId: requesterDog.id,
        position: 0,
        status: IMAGE_STATUS.APPROVED,
        url: `${trustedImageUrl("")}${"a".repeat(1_100)}`,
      },
    });
    const pushSpy = jest
      .spyOn(PushNotificationService, "enqueuePushNotification")
      .mockResolvedValue(undefined);
    const content = "🐕".repeat(1_000);

    const message = await new MessageService({}).sendMessage(content, requesterDog.id, match.id);

    expect(message.content).toBe(content);
    const payload = pushSpy.mock.calls[0]?.[0];
    expect(payload?.body).toBe(`${"🐕".repeat(397)}...`);
    expect([...(payload?.body ?? "")]).toHaveLength(400);
    expect(payload?.data).not.toHaveProperty("senderAvatarUrl");
  });

  test("does not forward an external approved photo to the notification extension", async () => {
    const { match, requesterDog } = await createMatch(true);
    await prisma.image.create({
      data: {
        dogId: requesterDog.id,
        position: 0,
        status: IMAGE_STATUS.APPROVED,
        url: "https://example.com/avatar.webp",
      },
    });
    const pushSpy = jest
      .spyOn(PushNotificationService, "enqueuePushNotification")
      .mockResolvedValue(undefined);

    await new MessageService({}).sendMessage("hello", requesterDog.id, match.id);

    expect(pushSpy.mock.calls[0]?.[0].data).not.toHaveProperty("senderAvatarUrl");
  });

  test("measures the avatar URL limit in payload bytes", async () => {
    const { match, requesterDog } = await createMatch(true);
    await prisma.image.create({
      data: {
        dogId: requesterDog.id,
        position: 0,
        status: IMAGE_STATUS.APPROVED,
        // 600 UTF-16 code units, but 1,200 UTF-8 bytes before the trusted
        // origin and path are counted.
        url: trustedImageUrl("🐕".repeat(300)),
      },
    });
    const pushSpy = jest
      .spyOn(PushNotificationService, "enqueuePushNotification")
      .mockResolvedValue(undefined);

    await new MessageService({}).sendMessage("hello", requesterDog.id, match.id);

    expect(pushSpy.mock.calls[0]?.[0].data).not.toHaveProperty("senderAvatarUrl");
  });
});
