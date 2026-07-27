import type { Prisma } from "@prisma/client";

import { createId } from "@paralleldrive/cuid2";

import { prisma } from ".";
import { dropDatabase } from "./drop-database";
import { breedData } from "./fixtures/breed-data";
import {
  PITOCA_DOG,
  PITOCA_USER,
  PITOCO_DOG,
  PITOCO_USER,
} from "./fixtures/fixed-dogs-data";
import { generateFakeUserWithDog } from "./fixtures/generate-fake-user-with-dog";

const interestData: Prisma.InterestCreateManyInput[] = [
  {
    requesterId: PITOCA_DOG.id,
    responderId: PITOCO_DOG.id,
    swipeType: "MAYBE",
  },
  {
    requesterId: PITOCO_DOG.id,
    responderId: PITOCA_DOG.id,
    swipeType: "INTERESTED",
  },
];

const matchData: Prisma.MatchCreateManyInput[] = [
  {
    id: createId(),
    requesterId: PITOCA_DOG.id,
    responderId: PITOCO_DOG.id,
  },
];

const seedDatabase = async () => {
  await prisma.breed.createMany({ data: breedData });
  await Promise.all([
    generateFakeUserWithDog(PITOCA_DOG, PITOCA_USER, true),
    generateFakeUserWithDog(PITOCO_DOG, PITOCO_USER, true),
    // `forEach` here meant the 100 filler users were fired off and never
    // awaited: the seed could finish while they were still being written.
    ...Array.from({ length: 100 }, () =>
      generateFakeUserWithDog(undefined, undefined, true),
    ),
  ]);

  await prisma.interest.createMany({ data: interestData });
  await prisma.match.createMany({ data: matchData });
};

const main = async () => {
  try {
    await dropDatabase();
    await seedDatabase();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();
