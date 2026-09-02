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

// Same order as the other database suites: the tables that reference a dog
// go first. There are no foreign keys in the schema (`relationMode =
// "prisma"`), but Prisma enforces required relations itself, so a leftover
// message from an earlier suite makes `dog.deleteMany` throw.
beforeEach(async () => {
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

it("records interest and lists it back", async () => {
  const { user } = await generateFakeUserWithDog();
  const caller = callerFor(user.id);

  await expect(caller.featureInterest.list()).resolves.toEqual([]);

  await caller.featureInterest.set({
    feature: "ai_story_video",
    interested: true,
  });

  await expect(caller.featureInterest.list()).resolves.toEqual([
    "ai_story_video",
  ]);
});

// The toggle can be tapped twice before the first request answers, and the
// row is unique on (userId, feature), so a plain `create` would fail the
// second time.
it("stays idempotent when the same feature is set twice", async () => {
  const { user } = await generateFakeUserWithDog();
  const caller = callerFor(user.id);

  await caller.featureInterest.set({
    feature: "referral_reward",
    interested: true,
  });
  await caller.featureInterest.set({
    feature: "referral_reward",
    interested: true,
  });

  await expect(
    prisma.featureInterest.count({ where: { userId: user.id } }),
  ).resolves.toBe(1);
});

it("removes only the untoggled feature", async () => {
  const { user } = await generateFakeUserWithDog();
  const caller = callerFor(user.id);

  await caller.featureInterest.set({
    feature: "referral_reward",
    interested: true,
  });
  await caller.featureInterest.set({
    feature: "ai_story_video",
    interested: true,
  });

  await caller.featureInterest.set({
    feature: "referral_reward",
    interested: false,
  });

  await expect(caller.featureInterest.list()).resolves.toEqual([
    "ai_story_video",
  ]);
});

// Untoggling something that was never toggled on is a retry, not an error.
it("accepts untoggling a feature that was never set", async () => {
  const { user } = await generateFakeUserWithDog();

  await expect(
    callerFor(user.id).featureInterest.set({
      feature: "ai_story_video",
      interested: false,
    }),
  ).resolves.toEqual({ feature: "ai_story_video", interested: false });
});

it("keeps one user's interest out of another user's list", async () => {
  const [{ user: first }, { user: second }] = await Promise.all([
    generateFakeUserWithDog(),
    generateFakeUserWithDog(),
  ]);

  await callerFor(first.id).featureInterest.set({
    feature: "ai_story_video",
    interested: true,
  });

  await expect(callerFor(second.id).featureInterest.list()).resolves.toEqual(
    [],
  );
});

it("rejects a feature id the app does not ship", async () => {
  const { user } = await generateFakeUserWithDog();

  await expect(
    callerFor(user.id).featureInterest.set({
      // The point of the test is the value the type already forbids.
      feature: "premium_for_life" as "ai_story_video",
      interested: true,
    }),
  ).rejects.toThrow(TRPCError);
});

it("rejects an unauthenticated caller", async () => {
  await expect(anonymousCaller().featureInterest.list()).rejects.toThrow(
    "UNAUTHORIZED",
  );
});
