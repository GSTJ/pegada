import { createId } from "@paralleldrive/cuid2";
import { Prisma } from "@prisma/client";

import { prisma } from ".";
import { breedData } from "./__mocks__/breed-data";
import {
  PITOCA_DOG,
  PITOCA_USER,
  PITOCO_DOG,
  PITOCO_USER
} from "./__mocks__/fixed-dogs-data";
import { generateFakeUserWithDog } from "./__mocks__/generate-fake-user-with-dog";
import { dropDatabase } from "./drop-database";

const interestData: Prisma.InterestCreateManyInput[] = [
  {
    requesterId: PITOCA_DOG.id,
    responderId: PITOCO_DOG.id,
    swipeType: "MAYBE"
  },
  {
    requesterId: PITOCO_DOG.id,
    responderId: PITOCA_DOG.id,
    swipeType: "INTERESTED"
  }
];

const matchData: Prisma.MatchCreateManyInput[] = [
  {
    id: createId(),
    requesterId: PITOCA_DOG.id,
    responderId: PITOCO_DOG.id
  }
];

const seedDatabase = async () => {
  await prisma.breed.createMany({ data: breedData });
  await Promise.all([
    generateFakeUserWithDog(PITOCA_DOG, PITOCA_USER, true),
    generateFakeUserWithDog(PITOCO_DOG, PITOCO_USER, true),
    Array.from({ length: 100 }).forEach(() => {
      return generateFakeUserWithDog(undefined, undefined, true);
    })
  ]);

  await prisma.interest.createMany({ data: interestData });
  await prisma.match.createMany({ data: matchData });
};

const main = async () => {
  try {
    await dropDatabase();
    await seedDatabase();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

void main();
