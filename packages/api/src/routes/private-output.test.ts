import prisma from "@pegada/database";
import { breedData } from "@pegada/database/fixtures/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";

import { appRouter } from "../root";
import { PushNotificationService } from "../services/push-notification-service";
import { createInnerTRPCContext } from "../trpc";

jest.mock("../services/push-notification-service", () => ({
  PushNotificationService: {
    enqueuePushNotification: jest.fn(async () => undefined),
  },
}));

jest.mock("../shared/observability", () => ({
  observability: {
    enabled: false,
    disabledReason: "explicitly-disabled",
    capture: jest.fn(),
    captureError: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    register: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  },
  getPostHogNode: jest.fn(() => null),
}));

jest.mock("superjson", () => ({
  __esModule: true,
  default: {
    serialize: (value: unknown) => value,
    deserialize: (value: unknown) => value,
  },
}));

const enqueuePushNotification = jest.mocked(
  PushNotificationService.enqueuePushNotification,
);

const callerFor = (userId: string) =>
  appRouter.createCaller(
    createInnerTRPCContext({ session: { user: { id: userId } } }),
  );

beforeAll(async () => {
  await prisma.breed.createMany({ data: breedData, skipDuplicates: true });
});

beforeEach(async () => {
  enqueuePushNotification.mockClear();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

it("returns only the match id after a mutual swipe", async () => {
  const codeExpiresAt = new Date(Date.now() + 60_000);
  const [
    { user: attacker, dog: attackerDog },
    { user: victim, dog: victimDog },
  ] = await Promise.all([
    generateFakeUserWithDog(),
    generateFakeUserWithDog(undefined, {
      email: "private-victim@pegada.app",
      code: "654321",
      codeExpiresAt,
      latitude: -15.793889,
      longitude: -47.882778,
      pushToken: "ExponentPushToken[private-victim]",
    }),
  ]);

  await prisma.interest.create({
    data: {
      requesterId: victimDog.id,
      responderId: attackerDog.id,
      swipeType: "INTERESTED",
    },
  });

  const response = await callerFor(attacker.id).swipe.swipe({
    id: victimDog.id,
    swipeType: "INTERESTED",
  });

  expect(response.match).toEqual({ id: expect.any(String) });
  expect(response.match).not.toHaveProperty("responder");

  const serialized = JSON.stringify(response);
  expect(serialized).not.toContain(victim.email);
  expect(serialized).not.toContain("654321");
  expect(serialized).not.toContain("ExponentPushToken[private-victim]");
  expect(serialized).not.toContain("-15.793889");
  expect(serialized).not.toContain("-47.882778");

  expect(enqueuePushNotification).toHaveBeenCalledWith(
    expect.objectContaining({ to: "ExponentPushToken[private-victim]" }),
  );
});

it("does not return notification-only relations after sending a message", async () => {
  const [{ user: sender, dog: senderDog }, { dog: receiverDog }] =
    await Promise.all([
      generateFakeUserWithDog(),
      generateFakeUserWithDog(undefined, {
        pushToken: "ExponentPushToken[private-receiver]",
      }),
    ]);

  const match = await prisma.match.create({
    data: { requesterId: senderDog.id, responderId: receiverDog.id },
  });

  const response = await callerFor(sender.id).message.send({
    matchId: match.id,
    content: "hello",
  });

  expect(response).toEqual({
    id: expect.any(String),
    content: "hello",
    createdAt: expect.any(Date),
    deletedAt: null,
    senderId: senderDog.id,
    receiverId: receiverDog.id,
    matchId: match.id,
  });
  expect(response).not.toHaveProperty("sender");
  expect(response).not.toHaveProperty("receiver");
  expect(JSON.stringify(response)).not.toContain(
    "ExponentPushToken[private-receiver]",
  );

  expect(enqueuePushNotification).toHaveBeenCalledWith(
    expect.objectContaining({ to: "ExponentPushToken[private-receiver]" }),
  );
});
