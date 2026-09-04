import { faker } from "@faker-js/faker";
import prisma from "@pegada/database";
import { breedData } from "@pegada/database/fixtures/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { Color, Dog, Gender, PlanType, Size, SwipeType } from "@prisma/client";
import { z } from "zod";

import { dogSafeSchema } from "../../dtos/dog-dto";
import { observability } from "../../shared/observability";
import { SwipeService } from "../swipe-service";
import { SuggestionService } from "./suggestion-service";

jest.mock("../../shared/observability", () => ({
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

afterAll(async () => {
  await prisma.$disconnect();
});

// Pulled out of the fixture literals below: nesting a faker call inside an
// options object inside a fixture inside `Promise.all` reads worse than a name.
const randomColor = () => faker.helpers.arrayElement(Object.values(Color));
const randomSize = () => faker.helpers.arrayElement(Object.values(Size));
const smallInt = () => faker.number.int({ min: 1, max: 10 });

const LIMIT = 10;

const capture = observability.capture as unknown as jest.Mock;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000);

/**
 * Backdates a pass. `updatedAt` is `@updatedAt`, so writing it through the
 * client would just stamp it with now again.
 */
const backdatePass = (requesterId: string, responderId: string, at: Date) =>
  prisma.$executeRaw`UPDATE "Interest" SET "updatedAt" = ${at} WHERE "requesterId" = ${requesterId} AND "responderId" = ${responderId}`;

/** The last Deck Served event, minus the distinct id every capture carries. */
const lastDeckServed = () => {
  const call = [...capture.mock.calls]
    .reverse()
    .find(([event]) => event === ANALYTICS_EVENTS.DECK_SERVED);

  if (!call) return null;

  const { distinctId: _distinctId, ...properties } = call[1] as Record<
    string,
    unknown
  >;

  return properties;
};

beforeAll(async () => {
  // Seed the database
  await prisma.breed.deleteMany();
  await prisma.breed.createMany({ data: breedData });
});

beforeEach(async () => {
  capture.mockClear();
  await prisma.image.deleteMany();
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.interest.deleteMany();
  await prisma.image.deleteMany();
  await prisma.dog.deleteMany();
  await prisma.user.deleteMany();
});

describe("SuggestionService", () => {
  describe("getPotentialMatches", () => {
    it("returns the right dog schema with the dog's distance", async () => {
      const [{ dog }] = await Promise.all([
        generateFakeUserWithDog(
          {
            gender: Gender.MALE,
          },
          {
            latitude: 1,
            longitude: 1,
          },
        ),
        generateFakeUserWithDog(
          {
            gender: Gender.FEMALE,
            breed: {},
          },
          {
            latitude: undefined,
            longitude: undefined,
          },
        ),
        generateFakeUserWithDog(
          {
            gender: Gender.FEMALE,
            color: randomColor(),
            size: randomSize(),
            preferredColor: randomColor(),
            preferredMaxAge: smallInt(),
            preferredMaxDistance: smallInt(),
            preferredMinAge: smallInt(),
            preferredSize: randomSize(),
            bio: faker.lorem.paragraph(),
            birthDate: new Date().toISOString(),
            name: faker.person.firstName(),
            weight: smallInt(),
          },
          {
            latitude: 0.05,
            longitude: 0.05,
          },
        ),
      ]);

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [],
      );

      z.array(dogSafeSchema).parse(potentialMatches);

      // Check if the breed is included correctly
      expect(
        potentialMatches.some((potentialMatch) => potentialMatch.breed?.id),
      ).toBeTruthy();

      // Check if the distance is included correctly
      expect(
        potentialMatches.some((potentialMatch) => potentialMatch.distance),
      ).toBeTruthy();

      // Check if distance is omitted when latitude or longitude is not provided
      expect(
        potentialMatches.some((potentialMatch) => !potentialMatch.distance),
      ).toBeTruthy();
    });

    it("returns the right amount of potential matches", async () => {
      const { dog } = await generateFakeUserWithDog({
        gender: Gender.MALE,
      });

      const emptyPotentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [],
      );

      expect(emptyPotentialMatches).toHaveLength(0);

      const EXTRA_DOGS = 2;

      await Promise.all(
        Array.from({ length: LIMIT + EXTRA_DOGS }).map(() =>
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
          }),
        ),
      );

      const fullPotentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [],
      );

      expect(fullPotentialMatches).toHaveLength(10);
    });

    it("excludes every dog the client already loaded", async () => {
      const [{ dog }, { dog: excludedDog }, { dog: includedDog }] =
        await Promise.all([
          generateFakeUserWithDog({ gender: Gender.MALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
        ]);

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [excludedDog.id],
      );

      expect(potentialMatches.map(({ id }) => id)).toContain(includedDog.id);
      expect(potentialMatches.map(({ id }) => id)).not.toContain(
        excludedDog.id,
      );
    });

    it("throws an error if dog user ID is not provided", async () => {
      const dog = {} as Dog;

      await expect(
        SuggestionService.getPotentialMatches(dog, LIMIT, []),
      ).rejects.toThrow("User ID is required");
    });

    it("returns dogs ordered by distance", async () => {
      const [
        { dog },
        { dog: farDog },
        { dog: withoutLocation },
        { dog: nearDog },
      ] = await Promise.all([
        generateFakeUserWithDog(
          { gender: Gender.MALE },
          { latitude: 0, longitude: 0 },
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { latitude: 10, longitude: 10 },
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { latitude: undefined, longitude: undefined },
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { latitude: 1, longitude: 1 },
        ),
      ]);

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [],
      );

      expect(potentialMatches).toHaveLength(3);
      expect(potentialMatches[0]!.id).toEqual(nearDog.id);
      expect(potentialMatches[1]!.id).toEqual(farDog.id);
      expect(potentialMatches[2]!.id).toEqual(withoutLocation.id);
    });

    test("swiped dogs are not returned", async () => {
      const { dog } = await generateFakeUserWithDog({
        gender: Gender.MALE,
      });
      const { dog: swipedDog } = await generateFakeUserWithDog({
        gender: Gender.FEMALE,
      });

      const firstPotentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [],
      );

      expect(firstPotentialMatches[0]?.id).toEqual(swipedDog.id);

      // Simulate a swipe
      await SwipeService.createOrUpdateInterest(
        dog.id,
        swipedDog.id,
        SwipeType.INTERESTED,
      );

      const secondPotentialMatches =
        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

      expect(secondPotentialMatches[0]?.id).not.toEqual(swipedDog.id);
    });

    test("premium users have priority on the queue if they liked you", async () => {
      const [{ dog }, { dog: nonPremiumDog }, { dog: premiumDog }] =
        await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE },
            { longitude: 0, latitude: 0 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { plan: PlanType.FREE, longitude: 0, latitude: 0 }, // Free is closer
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { plan: PlanType.PREMIUM, longitude: 1, latitude: 1 }, // But premium should have priority
          ),
        ]);

      const beforeLikesPotentialMatches =
        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

      // Check that the first potential match is the free user
      expect(beforeLikesPotentialMatches[0]!.id).toEqual(nonPremiumDog.id);

      // Simulate them both liking you
      await Promise.all([
        SwipeService.createOrUpdateInterest(
          premiumDog.id,
          dog.id,
          SwipeType.INTERESTED,
        ),
        SwipeService.createOrUpdateInterest(
          nonPremiumDog.id,
          dog.id,
          SwipeType.INTERESTED,
        ),
      ]);

      const afterLikesPotentialMatches =
        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

      // Check that the first potential match is the premium user
      expect(afterLikesPotentialMatches[0]!.id).toEqual(premiumDog.id);
    });

    test("a premium dog that liked someone else does not jump the queue", async () => {
      const [
        { dog },
        { dog: nearDog },
        { dog: premiumStranger },
        { dog: bystander },
      ] = await Promise.all([
        generateFakeUserWithDog(
          { gender: Gender.MALE },
          { longitude: 0, latitude: 0 },
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { plan: PlanType.FREE, longitude: 0, latitude: 0 }, // Co-located
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { plan: PlanType.PREMIUM, longitude: 1, latitude: 1 }, // Further away
        ),
        // Not in `dog`'s deck at all — same gender as the swiper.
        generateFakeUserWithDog(
          { gender: Gender.MALE },
          { longitude: 5, latitude: 5 },
        ),
      ]);

      // The premium dog liked SOMEONE ELSE. Being premium buys priority over
      // the people who liked you, not over everyone's deck everywhere.
      await SwipeService.createOrUpdateInterest(
        premiumStranger.id,
        bystander.id,
        SwipeType.INTERESTED,
      );

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        [],
      );

      expect(potentialMatches[0]!.id).toEqual(nearDog.id);
    });

    describe("Preferences", () => {
      test("gender", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
          generateFakeUserWithDog({ gender: Gender.MALE }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        const primary = potentialMatches.filter(
          (match) => match.deckTier === "primary",
        );

        expect(primary).toHaveLength(1);
        expect(primary[0]?.gender).toEqual(Gender.MALE);

        // The same gender dog is only ever a refill, never part of the deck
        // the preference describes.
        expect(potentialMatches[1]?.gender).toEqual(Gender.FEMALE);
        expect(potentialMatches[1]?.deckTier).toEqual("same_gender");
      });

      test("size", async () => {
        const numberOfMediumDogs = 2;

        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: Gender.MALE,
            size: Size.SMALL,
            preferredSize: Size.MEDIUM,
          }),
          generateFakeUserWithDog({ gender: Gender.FEMALE, size: Size.GIANT }),
          Array.from({ length: numberOfMediumDogs }).map(() =>
            generateFakeUserWithDog({
              gender: Gender.FEMALE,
              size: Size.MEDIUM,
            }),
          ),
          generateFakeUserWithDog({ gender: Gender.FEMALE, size: Size.SMALL }),
          generateFakeUserWithDog({ gender: Gender.FEMALE, size: Size.LARGE }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(numberOfMediumDogs);
      });

      test("color", async () => {
        const numberOfGoldenDogs = 2;

        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: Gender.MALE,
            color: Color.BROWN,
            preferredColor: Color.GOLDEN,
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            color: Color.BLACK,
          }),
          Array.from({ length: numberOfGoldenDogs }).map(() =>
            generateFakeUserWithDog({
              gender: Gender.FEMALE,
              color: Color.GOLDEN,
            }),
          ),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            color: Color.WHITE,
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            color: Color.TRICOLOR,
          }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(numberOfGoldenDogs);
        expect(
          potentialMatches.every((match) => match?.color === Color.GOLDEN),
        ).toBe(true);
      });

      test("age", async () => {
        const preferredMinAge = 2;
        const preferredMaxAge = 4;

        const getBirthDateByAge = (age: number) =>
          new Date(
            new Date().setFullYear(new Date().getFullYear() - age),
          ).toISOString();

        const [{ dog }, { dog: preferredAgeDog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: Gender.MALE,
            preferredMinAge,
            preferredMaxAge,
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            birthDate: getBirthDateByAge(preferredMinAge),
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            birthDate: getBirthDateByAge(preferredMaxAge + 1),
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            birthDate: getBirthDateByAge(preferredMinAge - 1),
          }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(1);
        expect(potentialMatches[0]!.id).toEqual(preferredAgeDog.id);
      });

      test("distance", async () => {
        const preferredMaxDistance = 10; // in kilometers

        const [{ dog }, { dog: nearDog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE, preferredMaxDistance },
            { latitude: 0, longitude: 0 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 }, // approximately 7 km away
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.2, longitude: 0.2 }, // approximately 28 km away
          ),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        const primary = potentialMatches.filter(
          (match) => match.deckTier === "primary",
        );

        expect(primary).toHaveLength(1);
        expect(primary[0]!.id).toEqual(nearDog.id);
      });
      test("breed", async () => {
        const preferredBreedId = faker.helpers.arrayElement(breedData).id!;
        const nonPreferredBreedId = faker.helpers.arrayElement(
          breedData.filter((breed) => breed.id !== preferredBreedId),
        ).id!;

        const [{ dog }, { dog: sameBreedDog }] = await Promise.all([
          generateFakeUserWithDog({ gender: "MALE" }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            breed: { connect: { id: preferredBreedId } },
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            breed: { connect: { id: nonPreferredBreedId } },
          }),
        ]);

        // Get potential matches
        const firstPotentialMatches =
          await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        expect(firstPotentialMatches).toHaveLength(2);

        // Update the dog's preferred breed
        const updatedDog = await prisma.dog.update({
          where: { id: dog.id },
          data: { preferredBreedId },
        });

        // Get potential matches
        const secondPotentialMatches =
          await SuggestionService.getPotentialMatches(updatedDog, LIMIT, []);

        expect(secondPotentialMatches).toHaveLength(1);
        expect(secondPotentialMatches[0]!.id).toEqual(sameBreedDog.id);
      });
    });

    describe("Shadowban", () => {
      it("does not return dogs with rejected images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: {
                position: 0,
                status: IMAGE_STATUS.REJECTED,
                url: faker.image.urlLoremFlickr(),
              },
            },
          }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(1);
      });

      it("does not return dogs with no approved images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: {
                position: 0,
                status: IMAGE_STATUS.PENDING,
                url: faker.image.urlLoremFlickr(),
              },
            },
          }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(1);
      });

      it("does not return dogs with no images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: undefined,
            },
          }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(1);
      });

      it("does not return pending images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE",
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: undefined,
              createMany: {
                data: [
                  {
                    position: 0,
                    status: IMAGE_STATUS.PENDING,
                    url: faker.image.urlLoremFlickr(),
                  },
                  {
                    position: 1,
                    status: IMAGE_STATUS.APPROVED,
                    url: faker.image.urlLoremFlickr(),
                  },
                ],
              },
            },
          }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(1);
        expect(potentialMatches[0]!.images).toHaveLength(1);
      });
    });

    describe("Refill", () => {
      test("a full primary deck is never topped up", async () => {
        const { dog } = await generateFakeUserWithDog({ gender: Gender.MALE });

        await Promise.all([
          ...Array.from({ length: LIMIT }).map(() =>
            generateFakeUserWithDog({ gender: Gender.FEMALE }),
          ),
          ...Array.from({ length: 3 }).map(() =>
            generateFakeUserWithDog({ gender: Gender.MALE }),
          ),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(LIMIT);
        expect(
          potentialMatches.every((match) => match.deckTier === "primary"),
        ).toBe(true);
      });

      test("a short primary deck is filled with same gender dogs, last", async () => {
        const [{ dog }, { dog: oppositeDog }] = await Promise.all([
          generateFakeUserWithDog({ gender: Gender.MALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
          generateFakeUserWithDog({ gender: Gender.MALE }),
          generateFakeUserWithDog({ gender: Gender.MALE }),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(3);
        expect(potentialMatches[0]!.id).toEqual(oppositeDog.id);
        expect(potentialMatches.map((match) => match.deckTier)).toEqual([
          "primary",
          "same_gender",
          "same_gender",
        ]);
      });

      test("dogs beyond the radius come after the ones inside it", async () => {
        const [{ dog }, { dog: nearDog }, { dog: farDog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE, preferredMaxDistance: 10 },
            { latitude: 0, longitude: 0 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 }, // roughly 8 km away
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.2, longitude: 0.2 }, // roughly 31 km away
          ),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches.map((match) => match.id)).toEqual([
          nearDog.id,
          farDog.id,
        ]);
        expect(potentialMatches.map((match) => match.deckTier)).toEqual([
          "primary",
          "beyond_radius",
        ]);
        expect(potentialMatches[1]!.distance).toBeGreaterThan(10);
      });

      test("no dog is served twice across the tiers", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE, preferredMaxDistance: 10 },
            { latitude: 0, longitude: 0 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.2, longitude: 0.2 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.MALE },
            { latitude: 0.05, longitude: 0.05 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.MALE },
            { latitude: 0.2, longitude: 0.2 },
          ),
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        const ids = potentialMatches.map((match) => match.id);

        // The male dog outside the radius is the one nothing reaches: the
        // radius is only dropped for the opposite gender tier.
        expect(ids).toHaveLength(3);
        expect(new Set(ids).size).toEqual(ids.length);
        expect(potentialMatches.map((match) => match.deckTier)).toEqual([
          "primary",
          "beyond_radius",
          "same_gender",
        ]);
      });

      test("a recent pass stays out of the deck", async () => {
        const [{ dog }, { dog: passedDog }] = await Promise.all([
          generateFakeUserWithDog({ gender: Gender.MALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
        ]);

        await SwipeService.createOrUpdateInterest(
          dog.id,
          passedDog.id,
          SwipeType.NOT_INTERESTED,
        );
        await backdatePass(dog.id, passedDog.id, daysAgo(13));

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(0);
      });

      test("an old pass comes back, tagged and at the end", async () => {
        const [{ dog }, { dog: passedDog }, { dog: freshDog }] =
          await Promise.all([
            generateFakeUserWithDog(
              { gender: Gender.MALE },
              { latitude: 0, longitude: 0 },
            ),
            generateFakeUserWithDog(
              { gender: Gender.FEMALE },
              { latitude: 0, longitude: 0 }, // co-located, so distance cannot be why it is last
            ),
            generateFakeUserWithDog(
              { gender: Gender.FEMALE },
              { latitude: 5, longitude: 5 },
            ),
          ]);

        await SwipeService.createOrUpdateInterest(
          dog.id,
          passedDog.id,
          SwipeType.NOT_INTERESTED,
        );
        await backdatePass(dog.id, passedDog.id, daysAgo(15));

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches.map((match) => match.id)).toEqual([
          freshDog.id,
          passedDog.id,
        ]);
        expect(potentialMatches[1]!.deckTier).toEqual("recycled_pass");
      });

      test("a like is never recycled", async () => {
        const [{ dog }, { dog: likedDog }] = await Promise.all([
          generateFakeUserWithDog({ gender: Gender.MALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
        ]);

        await SwipeService.createOrUpdateInterest(
          dog.id,
          likedDog.id,
          SwipeType.INTERESTED,
        );
        await backdatePass(dog.id, likedDog.id, daysAgo(400));

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches).toHaveLength(0);
      });

      test("an active owner outranks a dormant one at the same distance", async () => {
        const [{ dog }, { dog: dormantDog }, { dog: activeDog }] =
          await Promise.all([
            generateFakeUserWithDog(
              { gender: Gender.MALE },
              { latitude: 0, longitude: 0 },
            ),
            generateFakeUserWithDog(
              { gender: Gender.FEMALE },
              { latitude: 0, longitude: 0, lastActiveAt: daysAgo(90) },
            ),
            generateFakeUserWithDog(
              { gender: Gender.FEMALE },
              { latitude: 0, longitude: 0, lastActiveAt: daysAgo(1) },
            ),
          ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          [],
        );

        expect(potentialMatches.map((match) => match.id)).toEqual([
          activeDog.id,
          dormantDog.id,
        ]);
      });
    });

    describe("Deck Served", () => {
      test("reports the tier split and the supply around the swiper", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE },
            { latitude: 0, longitude: 0 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 }, // roughly 8 km
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.15, longitude: 0.15 }, // roughly 24 km
          ),
          generateFakeUserWithDog(
            { gender: Gender.MALE },
            { latitude: 0.2, longitude: 0.2 }, // roughly 31 km
          ),
        ]);

        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        expect(lastDeckServed()).toEqual({
          beyond_radius_count: 0,
          empty: false,
          primary_count: 2,
          radius_km: null,
          recycled_count: 0,
          requested: LIMIT,
          same_gender_count: 1,
          served: 3,
          supply_10km: 1,
          supply_25km: 2,
          supply_50km: 3,
        });
      });

      test("an empty deck is reported as empty", async () => {
        const { dog } = await generateFakeUserWithDog(
          { gender: Gender.MALE, preferredMaxDistance: 5 },
          { latitude: 0, longitude: 0 },
        );

        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        expect(lastDeckServed()).toMatchObject({
          empty: true,
          radius_km: 5,
          served: 0,
          supply_10km: 0,
          supply_25km: 0,
          supply_50km: 0,
        });
      });

      test("a full page skips the supply probe", async () => {
        const { dog } = await generateFakeUserWithDog(
          { gender: Gender.MALE },
          { latitude: 0, longitude: 0 },
        );

        await Promise.all(
          Array.from({ length: LIMIT }).map(() =>
            generateFakeUserWithDog(
              { gender: Gender.FEMALE },
              { latitude: 0.05, longitude: 0.05 },
            ),
          ),
        );

        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        // Nothing was short, so nothing was counted.
        expect(lastDeckServed()).toMatchObject({
          empty: false,
          served: LIMIT,
          supply_10km: null,
          supply_25km: null,
          supply_50km: null,
        });
      });

      test("a radius that filters nothing is reported as no radius", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE, preferredMaxDistance: 300 },
            { latitude: 0, longitude: 0 },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 },
          ),
        ]);

        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        expect(lastDeckServed()).toMatchObject({
          // The slider is parked at the far end, so no dog was ever excluded
          // for being far away and the beyond radius tier never ran.
          beyond_radius_count: 0,
          radius_km: null,
          served: 1,
        });
      });

      test("supply is unknown when the swiper has no location", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE },
            { latitude: null, longitude: null },
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 },
          ),
        ]);

        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        expect(lastDeckServed()).toMatchObject({
          served: 1,
          supply_10km: null,
          supply_25km: null,
          supply_50km: null,
        });
      });
    });
  });
});
