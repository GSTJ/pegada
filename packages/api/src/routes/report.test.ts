import prisma from "@pegada/database";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";
import { TRPCError } from "@trpc/server";

import { appRouter } from "../root";
import { createInnerTRPCContext } from "../trpc";

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

const callerFor = (userId: string) =>
  appRouter.createCaller(
    createInnerTRPCContext({ session: { user: { id: userId } } }),
  );

const anonymousCaller = () =>
  appRouter.createCaller(createInnerTRPCContext({ session: null }));

beforeEach(async () => {
  await prisma.report.deleteMany();
  await prisma.featureInterest.deleteMany();
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

it("writes a row naming the reporter, the dog and the reason", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  const result = await callerFor(reporter.id).report.create({
    targetType: "dog",
    targetId: dog.id,
    reason: "fake_profile",
  });

  const stored = await prisma.report.findUniqueOrThrow({
    where: { id: result.id },
  });

  expect(stored).toMatchObject({
    reporterId: reporter.id,
    targetType: "DOG",
    targetId: dog.id,
    reason: "FAKE_PROFILE",
    details: null,
  });
});

it("stores the optional free text", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await callerFor(reporter.id).report.create({
    targetType: "dog",
    targetId: dog.id,
    reason: "harassment",
    details: "  said something threatening in chat  ",
  });

  const stored = await prisma.report.findFirstOrThrow({
    where: { reporterId: reporter.id },
  });

  expect(stored.details).toBe("said something threatening in chat");
});

// A box holding only spaces is not a complaint anyone can read.
it("treats blank free text as no free text", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await callerFor(reporter.id).report.create({
    targetType: "dog",
    targetId: dog.id,
    reason: "spam",
    details: "   ",
  });

  const stored = await prisma.report.findFirstOrThrow({
    where: { reporterId: reporter.id },
  });

  expect(stored.details).toBeNull();
});

it("rejects free text longer than 500 characters", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "dog",
      targetId: dog.id,
      reason: "other",
      details: "a".repeat(501),
    }),
  ).rejects.toThrow();

  await expect(prisma.report.count()).resolves.toBe(0);
});

it("accepts free text of exactly 500 characters", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await callerFor(reporter.id).report.create({
    targetType: "dog",
    targetId: dog.id,
    reason: "other",
    details: "a".repeat(500),
  });

  await expect(prisma.report.count()).resolves.toBe(1);
});

it("reports an account as well as a dog", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { user: target } = await generateFakeUserWithDog();

  await callerFor(reporter.id).report.create({
    targetType: "user",
    targetId: target.id,
    reason: "inappropriate_photos",
  });

  const stored = await prisma.report.findFirstOrThrow({
    where: { reporterId: reporter.id },
  });

  expect(stored).toMatchObject({
    targetType: "USER",
    targetId: target.id,
    reason: "INAPPROPRIATE_PHOTOS",
  });
});

// The column has no foreign key of its own under `relationMode = "prisma"`,
// so nothing but this check keeps complaints about nothing out of the table.
it("refuses a dog that does not exist", async () => {
  const { user: reporter } = await generateFakeUserWithDog();

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "dog",
      targetId: "no-such-dog",
      reason: "spam",
    }),
  ).rejects.toThrow(TRPCError);

  await expect(prisma.report.count()).resolves.toBe(0);
});

it("refuses a deleted dog", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await prisma.dog.update({
    where: { id: dog.id },
    data: { deletedAt: new Date() },
  });

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "dog",
      targetId: dog.id,
      reason: "spam",
    }),
  ).rejects.toThrow(TRPCError);

  await expect(prisma.report.count()).resolves.toBe(0);
});

it("refuses an account that does not exist", async () => {
  const { user: reporter } = await generateFakeUserWithDog();

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "user",
      targetId: "no-such-user",
      reason: "spam",
    }),
  ).rejects.toThrow(TRPCError);

  await expect(prisma.report.count()).resolves.toBe(0);
});

// Otherwise a count per profile can be inflated by its own owner.
it("refuses a report of the reporter's own dog", async () => {
  const { user: reporter, dog } = await generateFakeUserWithDog();

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "dog",
      targetId: dog.id,
      reason: "spam",
    }),
  ).rejects.toThrow(TRPCError);

  await expect(prisma.report.count()).resolves.toBe(0);
});

it("refuses a report of the reporter's own account", async () => {
  const { user: reporter } = await generateFakeUserWithDog();

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "user",
      targetId: reporter.id,
      reason: "spam",
    }),
  ).rejects.toThrow(TRPCError);

  await expect(prisma.report.count()).resolves.toBe(0);
});

it("rejects a reason outside the five choices", async () => {
  const { user: reporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await expect(
    callerFor(reporter.id).report.create({
      targetType: "dog",
      targetId: dog.id,
      // @ts-expect-error deliberately outside the enum
      reason: "because",
    }),
  ).rejects.toThrow();

  await expect(prisma.report.count()).resolves.toBe(0);
});

it("requires a signed in reporter", async () => {
  const { dog } = await generateFakeUserWithDog();

  await expect(
    anonymousCaller().report.create({
      targetType: "dog",
      targetId: dog.id,
      reason: "spam",
    }),
  ).rejects.toThrow(TRPCError);

  await expect(prisma.report.count()).resolves.toBe(0);
});

// Two people complaining about the same dog is the signal the kill criterion
// in #273 reads, so both rows have to survive.
it("keeps one row per complaint about the same dog", async () => {
  const { user: firstReporter } = await generateFakeUserWithDog();
  const { user: secondReporter } = await generateFakeUserWithDog();
  const { dog } = await generateFakeUserWithDog();

  await callerFor(firstReporter.id).report.create({
    targetType: "dog",
    targetId: dog.id,
    reason: "fake_profile",
  });
  await callerFor(secondReporter.id).report.create({
    targetType: "dog",
    targetId: dog.id,
    reason: "spam",
  });

  await expect(
    prisma.report.count({ where: { targetType: "DOG", targetId: dog.id } }),
  ).resolves.toBe(2);
});
