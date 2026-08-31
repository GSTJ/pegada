import prisma from "@pegada/database";
import { breedData } from "@pegada/database/fixtures/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";
import {
  AccountBlockedError,
  DogUnavailableError,
} from "@pegada/shared/errors/errors";
import { Gender } from "@prisma/client";

import { appRouter } from "../root";
import { DogService } from "../services/dog-service";
import { PushNotificationService } from "../services/push-notification-service";
import { SwipeService } from "../services/swipe-service";
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

jest.setTimeout(30_000);

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

it("blocks a banned account but still lets it delete the account", async () => {
  const { user } = await generateFakeUserWithDog({ banned: true });
  const caller = callerFor(user.id);

  await expect(caller.swipe.all({ limit: 10 })).rejects.toMatchObject({
    code: "FORBIDDEN",
    message: AccountBlockedError.message,
  });

  await expect(caller.user.deleteMe()).resolves.toEqual({ ok: true });
  await expect(
    prisma.user.findUnique({ where: { id: user.id } }),
  ).resolves.toBeNull();
});

it("rejects self, banned, and deleted swipe targets without writing interests", async () => {
  const [requester, bannedTarget, removedTarget] = await Promise.all([
    generateFakeUserWithDog(),
    generateFakeUserWithDog({ banned: true }),
    generateFakeUserWithDog(),
  ]);

  await prisma.image.deleteMany({ where: { dogId: removedTarget.dog.id } });
  await prisma.dog.delete({ where: { id: removedTarget.dog.id } });
  await prisma.user.delete({ where: { id: removedTarget.user.id } });

  const caller = callerFor(requester.user.id);
  await Promise.all(
    [requester.dog.id, bannedTarget.dog.id, removedTarget.dog.id].map((id) =>
      expect(
        caller.swipe.swipe({ id, swipeType: "INTERESTED" }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: DogUnavailableError.message,
      }),
    ),
  );

  await expect(
    prisma.interest.count({ where: { requesterId: requester.dog.id } }),
  ).resolves.toBe(0);
});

it("serializes concurrent free likes at the daily limit", async () => {
  const requester = await generateFakeUserWithDog();
  const targets = await Promise.all(
    Array.from({ length: 12 }, () => generateFakeUserWithDog()),
  );
  const caller = callerFor(requester.user.id);

  const results = await Promise.allSettled(
    targets.map(({ dog }) =>
      caller.swipe.swipe({ id: dog.id, swipeType: "INTERESTED" }),
    ),
  );

  const fulfilled = results.filter(({ status }) => status === "fulfilled");
  const rejected = results.filter(({ status }) => status === "rejected");

  expect(fulfilled).toHaveLength(10);
  expect(rejected).toHaveLength(2);
  expect(rejected).toEqual([
    expect.objectContaining({
      reason: expect.objectContaining({ code: "TOO_MANY_REQUESTS" }),
    }),
    expect.objectContaining({
      reason: expect.objectContaining({ code: "TOO_MANY_REQUESTS" }),
    }),
  ]);
  await expect(
    prisma.interest.count({
      where: {
        requesterId: requester.dog.id,
        swipeType: { in: ["INTERESTED", "MAYBE"] },
      },
    }),
  ).resolves.toBe(10);
});

it("keeps the rolling quota after dislikes and dog replacement", async () => {
  const requester = await generateFakeUserWithDog();
  const targets = await Promise.all(
    Array.from({ length: 11 }, () => generateFakeUserWithDog()),
  );
  const caller = callerFor(requester.user.id);

  for (const { dog } of targets.slice(0, 10)) {
    // Keep each pair in order: the dislike must not erase the preceding like.
    // eslint-disable-next-line no-await-in-loop
    await caller.swipe.swipe({ id: dog.id, swipeType: "INTERESTED" });
    // eslint-disable-next-line no-await-in-loop
    await caller.swipe.swipe({ id: dog.id, swipeType: "NOT_INTERESTED" });
  }

  await DogService.deleteDog(requester.dog.id);
  await prisma.dog.create({
    data: {
      userId: requester.user.id,
      name: "Replacement",
      gender: Gender.MALE,
      images: {
        create: {
          position: 0,
          status: "APPROVED",
          url: "https://placedog.net/800/600",
        },
      },
    },
  });

  await expect(
    caller.swipe.swipe({
      id: targets[10]!.dog.id,
      swipeType: "INTERESTED",
    }),
  ).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

  await expect(
    prisma.interest.count({
      where: {
        requesterId: requester.dog.id,
        swipeType: "NOT_INTERESTED",
        lastPositiveAt: { not: null },
      },
    }),
  ).resolves.toBe(10);
});

it("resets a legacy quota only after its tenth newest like expires", async () => {
  const requester = await generateFakeUserWithDog();
  const targets = await Promise.all(
    Array.from({ length: 11 }, () => generateFakeUserWithDog()),
  );
  const now = Date.now();
  const timestamps = targets.map(
    (_, index) => new Date(now - (index + 1) * 60 * 60 * 1000),
  );

  await prisma.interest.createMany({
    data: targets.map(({ dog }, index) => ({
      requesterId: requester.dog.id,
      responderId: dog.id,
      swipeType: "INTERESTED",
      lastPositiveAt: timestamps[index],
    })),
  });

  const quota = await new SwipeService({}).getRemainingDailyLikes({
    userId: requester.user.id,
  });

  expect(quota.remainingSwipes).toBe(0);
  expect(quota.likeLimitResetAt).toEqual(
    new Date(timestamps[9]!.getTime() + 24 * 60 * 60 * 1000),
  );
});

it("keeps one interest row for concurrent writes to the same pair", async () => {
  const [requester, responder] = await Promise.all([
    generateFakeUserWithDog(),
    generateFakeUserWithDog(),
  ]);
  const caller = callerFor(requester.user.id);

  await Promise.all(
    Array.from({ length: 8 }, () =>
      caller.swipe.swipe({
        id: responder.dog.id,
        swipeType: "INTERESTED",
      }),
    ),
  );

  await expect(
    prisma.interest.count({
      where: {
        requesterId: requester.dog.id,
        responderId: responder.dog.id,
      },
    }),
  ).resolves.toBe(1);
});

it("creates one match when both dogs like each other concurrently", async () => {
  const [first, second] = await Promise.all([
    generateFakeUserWithDog(undefined, {
      pushToken: "ExponentPushToken[first]",
    }),
    generateFakeUserWithDog(undefined, {
      pushToken: "ExponentPushToken[second]",
    }),
  ]);

  const responses = await Promise.all([
    callerFor(first.user.id).swipe.swipe({
      id: second.dog.id,
      swipeType: "INTERESTED",
    }),
    callerFor(second.user.id).swipe.swipe({
      id: first.dog.id,
      swipeType: "INTERESTED",
    }),
  ]);

  expect(responses.filter(({ match }) => Boolean(match))).toHaveLength(1);
  await expect(
    prisma.match.count({ where: { deletedAt: null } }),
  ).resolves.toBe(1);
});

it("keeps banned and self profiles out of the swipe deck and direct lookup", async () => {
  const [requester, visibleTarget, bannedTarget] = await Promise.all([
    generateFakeUserWithDog({ gender: Gender.MALE }),
    generateFakeUserWithDog({ gender: Gender.FEMALE }),
    generateFakeUserWithDog({ gender: Gender.FEMALE, banned: true }),
  ]);
  const caller = callerFor(requester.user.id);

  const results = await caller.swipe.all({ limit: 10 });
  expect(results.map(({ id }) => id)).toContain(visibleTarget.dog.id);
  expect(results.map(({ id }) => id)).not.toContain(requester.dog.id);
  expect(results.map(({ id }) => id)).not.toContain(bannedTarget.dog.id);

  await expect(
    caller.dog.get({ id: bannedTarget.dog.id }),
  ).rejects.toMatchObject({
    code: "NOT_FOUND",
    message: DogUnavailableError.message,
  });
});
