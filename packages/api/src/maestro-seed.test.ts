/**
 * The Maestro fixture is the starting state of every E2E flow, and it runs
 * against a database the previous run already swiped, renamed and unmatched.
 * So the property worth asserting is not "it inserts rows" but "seeding twice
 * leaves the same rows as seeding once", including after a flow has done the
 * things flows do.
 *
 * It lives in this package because this is where the jest setup and the test
 * Postgres are (`pretest` runs `@pegada/database test:db:setup`);
 * packages/database has no runner of its own.
 */

import prisma from "@pegada/database";
import {
  SEED_DOG_IDS,
  seedMaestroFixtures,
} from "@pegada/database/maestro-seed";
import { SwipeType } from "@prisma/client";

jest.setTimeout(60_000);

// Breed is deliberately left alone. The seed upserts the one breed it needs,
// and suites that build their fixtures with `generateFakeUserWithDog` connect
// to whatever catalogue is already in the database — wiping it here is enough
// to fail whichever of them jest happens to run next.
const wipe = async () => {
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
};

beforeEach(wipe);

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

/** Everything a flow reads, with the volatile columns left out. */
const snapshot = async () => ({
  dogs: await prisma.dog.findMany({
    where: { deletedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, name: true, userId: true, bio: true },
  }),
  images: await prisma.image.findMany({
    orderBy: { id: "asc" },
    select: { id: true, dogId: true, position: true, url: true, status: true },
  }),
  interests: await prisma.interest.findMany({
    where: { deletedAt: null },
    orderBy: [{ requesterId: "asc" }, { responderId: "asc" }],
    select: {
      requesterId: true,
      responderId: true,
      swipeType: true,
      matchId: true,
    },
  }),
  matches: await prisma.match.findMany({
    where: { deletedAt: null },
    orderBy: { id: "asc" },
    select: { id: true, requesterId: true, responderId: true },
  }),
  messages: await prisma.message.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { content: true, senderId: true, matchId: true },
  }),
});

const matchBetween = (first: string, second: string) => ({
  deletedAt: null,
  OR: [
    { requesterId: first, responderId: second },
    { requesterId: second, responderId: first },
  ],
});

describe("maestro seed", () => {
  it("writes the documented fixture and does not move when it runs again", async () => {
    await seedMaestroFixtures();
    const first = await snapshot();

    await seedMaestroFixtures();
    const second = await snapshot();

    expect(second).toEqual(first);

    // Rex, Bella, Nina, Mel, MatchMe and the six SwipeDogs, one dog each.
    expect(second.dogs).toHaveLength(11);
    expect(
      second.dogs
        .filter((dog) =>
          (Object.values(SEED_DOG_IDS) as string[]).includes(dog.id),
        )
        .map((dog) => [dog.id, dog.name]),
    ).toEqual([
      [SEED_DOG_IDS.bella, "Bella"],
      [SEED_DOG_IDS.mel, "Mel"],
      [SEED_DOG_IDS.nina, "Nina"],
      [SEED_DOG_IDS.rex, "Rex"],
    ]);

    // The gallery flow 45 pages through. Every other dog has one photo.
    expect(
      second.images.filter((image) => image.dogId === SEED_DOG_IDS.nina),
    ).toHaveLength(4);
    expect(
      second.images.filter((image) => image.dogId === SEED_DOG_IDS.rex),
    ).toHaveLength(1);

    // Two matches: Bella with the short conversation, Nina with an empty
    // thread for the long-chat fixture to fill.
    const bellaMatch = await prisma.match.findFirstOrThrow({
      where: matchBetween(SEED_DOG_IDS.rex, SEED_DOG_IDS.bella),
    });
    const ninaMatch = await prisma.match.findFirstOrThrow({
      where: matchBetween(SEED_DOG_IDS.rex, SEED_DOG_IDS.nina),
    });
    expect(second.matches).toHaveLength(2);
    expect(second.messages.map((message) => message.matchId)).toEqual([
      bellaMatch.id,
      bellaMatch.id,
    ]);
    expect(
      second.messages.every((message) => message.matchId !== ninaMatch.id),
    ).toBe(true);

    // Mel is the one seed dog left on the deck: no interest either way.
    expect(
      second.interests.filter(
        (interest) =>
          interest.requesterId === SEED_DOG_IDS.mel ||
          interest.responderId === SEED_DOG_IDS.mel,
      ),
    ).toHaveLength(0);
  });

  it("re-seeds after an unmatch has soft deleted the rows underneath it", async () => {
    await seedMaestroFixtures();

    const bellaMatch = await prisma.match.findFirstOrThrow({
      where: matchBetween(SEED_DOG_IDS.rex, SEED_DOG_IDS.bella),
    });

    // What the app leaves behind when Rex unmatches Bella and then swipes her
    // away again: the match soft deleted, the interest soft deleted and
    // flipped, and the match id parked on the OTHER side of the pair, which is
    // where SwipeService writes it. Looking any of these up with a
    // `deletedAt: null` filter reads nothing and inserts on top of a live
    // unique key — issue #224.
    await prisma.match.update({
      where: { id: bellaMatch.id },
      data: { deletedAt: new Date() },
    });
    await prisma.interest.update({
      where: {
        requesterId_responderId: {
          requesterId: SEED_DOG_IDS.rex,
          responderId: SEED_DOG_IDS.bella,
        },
      },
      data: {
        deletedAt: new Date(),
        matchId: null,
        swipeType: SwipeType.NOT_INTERESTED,
      },
    });
    await prisma.interest.update({
      where: {
        requesterId_responderId: {
          requesterId: SEED_DOG_IDS.bella,
          responderId: SEED_DOG_IDS.rex,
        },
      },
      data: { matchId: bellaMatch.id },
    });

    await expect(seedMaestroFixtures()).resolves.toBeDefined();

    const restored = await prisma.match.findUniqueOrThrow({
      where: { id: bellaMatch.id },
    });
    expect(restored.deletedAt).toBeNull();
    expect(await prisma.match.count({ where: { deletedAt: null } })).toBe(2);

    const interest = await prisma.interest.findUniqueOrThrow({
      where: {
        requesterId_responderId: {
          requesterId: SEED_DOG_IDS.rex,
          responderId: SEED_DOG_IDS.bella,
        },
      },
    });
    expect(interest.deletedAt).toBeNull();
    expect(interest.swipeType).toBe(SwipeType.INTERESTED);
    expect(interest.matchId).toBe(bellaMatch.id);
  });

  it("restores a dog a flow deleted instead of creating a second one", async () => {
    await seedMaestroFixtures();

    await prisma.dog.update({
      where: { id: SEED_DOG_IDS.nina },
      data: { name: "Nina-renamed", deletedAt: new Date() },
    });
    await prisma.image.deleteMany({ where: { dogId: SEED_DOG_IDS.nina } });

    await seedMaestroFixtures();

    const nina = await prisma.dog.findUniqueOrThrow({
      where: { id: SEED_DOG_IDS.nina },
      include: { images: true },
    });
    expect(nina.deletedAt).toBeNull();
    expect(nina.name).toBe("Nina");
    expect(nina.images).toHaveLength(4);
    expect(
      await prisma.dog.count({
        where: { userId: nina.userId, deletedAt: null },
      }),
    ).toBe(1);
  });
});
