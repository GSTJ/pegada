import { Gender } from "@prisma/client";

import prisma from "@pegada/database";

import MessageService from "./MessageService";
import { PushNotificationService } from "./PushNotificationService";

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

  return { match, requesterDog };
};

describe("MessageService.sendMessage", () => {
  test("creates one message for concurrent requests with the same client ID", async () => {
    const { match, requesterDog } = await createMatch(true);
    const messageService = new MessageService({});
    const pushSpy = jest
      .spyOn(PushNotificationService, "enqueuePushNotification")
      .mockResolvedValue(undefined);

    const messages = await Promise.all([
      messageService.sendMessage("hello", requesterDog.id, match.id, "notification-reply-id"),
      messageService.sendMessage("hello", requesterDog.id, match.id, "notification-reply-id"),
    ]);

    expect(messages[0].id).toBe("notification-reply-id");
    expect(messages[1].id).toBe(messages[0].id);
    await expect(prisma.message.count()).resolves.toBe(1);
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  test("rejects reusing a client ID for different message data", async () => {
    const { match, requesterDog } = await createMatch();
    const messageService = new MessageService({});

    await messageService.sendMessage("hello", requesterDog.id, match.id, "notification-reply-id");

    await expect(
      messageService.sendMessage("different", requesterDog.id, match.id, "notification-reply-id"),
    ).rejects.toThrow("Invalid clientMessageId");
    await expect(prisma.message.count()).resolves.toBe(1);
  });
});
