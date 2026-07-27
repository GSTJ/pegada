import prisma from "@pegada/database";
import { breedData } from "@pegada/database/fixtures/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";

import MessageService from "./message-service";

jest.mock("../shared/posthog", () => ({
  posthog: {
    captureException: jest.fn(),
    capture: jest.fn(),
    identify: jest.fn(),
    isFeatureEnabled: jest.fn(),
    shutdown: jest.fn(),
  },
}));

afterAll(async () => {
  await prisma.$disconnect();
});

beforeAll(async () => {
  await prisma.breed.deleteMany();
  await prisma.breed.createMany({ data: breedData });
});

beforeEach(async () => {
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

/** Two matched dogs and a message the first one sent to the second. */
const seedConversation = async () => {
  const [{ dog: sender }, { dog: receiver }] = await Promise.all([
    generateFakeUserWithDog(),
    generateFakeUserWithDog(),
  ]);

  const match = await prisma.match.create({
    data: { requesterId: sender.id, responderId: receiver.id },
  });

  const message = await prisma.message.create({
    data: {
      content: "woof",
      senderId: sender.id,
      receiverId: receiver.id,
      matchId: match.id,
    },
  });

  return { sender, receiver, match, message };
};

describe("MessageService.deleteMessage", () => {
  it("soft-deletes a message its sender owns", async () => {
    const { sender, message } = await seedConversation();

    await MessageService.deleteMessage({
      messageId: message.id,
      senderId: sender.id,
    });

    const deleted = await prisma.message.findUnique({
      where: { id: message.id },
    });

    expect(deleted?.deletedAt).toBeInstanceOf(Date);
  });

  it("refuses to delete a message owned by another dog", async () => {
    const { receiver, message } = await seedConversation();

    await expect(
      MessageService.deleteMessage({
        messageId: message.id,
        senderId: receiver.id,
      }),
    ).rejects.toThrow("the sender is not the owner of the message");

    const untouched = await prisma.message.findUnique({
      where: { id: message.id },
    });

    expect(untouched?.deletedAt).toBeNull();
  });

  it("throws for an unknown message id", async () => {
    const { sender } = await seedConversation();

    await expect(
      MessageService.deleteMessage({
        messageId: "does-not-exist",
        senderId: sender.id,
      }),
    ).rejects.toThrow("Invalid messageId");
  });

  it("does not delete twice", async () => {
    const { sender, message } = await seedConversation();

    await MessageService.deleteMessage({
      messageId: message.id,
      senderId: sender.id,
    });

    await expect(
      MessageService.deleteMessage({
        messageId: message.id,
        senderId: sender.id,
      }),
    ).rejects.toThrow("Invalid messageId");
  });
});
