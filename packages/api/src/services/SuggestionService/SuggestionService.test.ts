import { faker } from "@faker-js/faker";
import { Color, Dog, Gender, PlanType, Size, SwipeType } from "@prisma/client";
import { z } from "zod";

import prisma from "@pegada/database";
import { breedData } from "@pegada/database/__mocks__/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/__mocks__/generate-fake-user-with-dog";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { dogSafeSchema } from "../../dtos/dogDto";
import { CheckPushNotificationReceiptsQueue } from "../../queue/CheckPushNotificationReceiptsQueue";
import { SendPushNotificationQueue } from "../../queue/SendPushNotificationQueue";
import { SwipeService } from "../SwipeService";
import { SuggestionService } from "./SuggestionService";

jest.mock("@bugsnag/js", () => ({
  start: jest.fn(),
  notify: jest.fn(),
  setContext: jest.fn()
}));

afterAll(async () => {
  await prisma.$disconnect();
  await SendPushNotificationQueue.close();
  await CheckPushNotificationReceiptsQueue.close();
});

const LIMIT = 10;

beforeAll(async () => {
  // Seed the database
  await prisma.breed.deleteMany();
  await prisma.breed.createMany({ data: breedData });
});

beforeEach(async () => {
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
            gender: Gender.MALE
          },
          {
            latitude: 1,
            longitude: 1
          }
        ),
        generateFakeUserWithDog(
          {
            gender: Gender.FEMALE,
            breed: {}
          },
          {
            latitude: undefined,
            longitude: undefined
          }
        ),
        generateFakeUserWithDog(
          {
            gender: Gender.FEMALE,
            color: faker.helpers.arrayElement(Object.values(Color)),
            size: faker.helpers.arrayElement(Object.values(Size)),
            preferredColor: faker.helpers.arrayElement(Object.values(Color)),
            preferredMaxAge: faker.number.int({ min: 1, max: 10 }),
            preferredMaxDistance: faker.number.int({ min: 1, max: 10 }),
            preferredMinAge: faker.number.int({ min: 1, max: 10 }),
            preferredSize: faker.helpers.arrayElement(Object.values(Size)),
            bio: faker.lorem.paragraph(),
            birthDate: new Date().toISOString(),
            name: faker.person.firstName(),
            weight: faker.number.int({ min: 1, max: 10 })
          },
          {
            latitude: 0.05,
            longitude: 0.05
          }
        )
      ]);

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        []
      );

      z.array(dogSafeSchema).parse(potentialMatches);

      // Check if the breed is included correctly
      expect(
        potentialMatches.some((potentialMatch) => potentialMatch.breed?.id)
      ).toBeTruthy();

      // Check if the distance is included correctly
      expect(
        potentialMatches.some((potentialMatch) => potentialMatch.distance)
      ).toBeTruthy();

      // Check if distance is omitted when latitude or longitude is not provided
      expect(
        potentialMatches.some((potentialMatch) => !potentialMatch.distance)
      ).toBeTruthy();
    });

    it("returns the right amount of potential matches", async () => {
      const { dog } = await generateFakeUserWithDog({
        gender: Gender.MALE
      });

      const emptyPotentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        []
      );

      expect(emptyPotentialMatches).toHaveLength(0);

      const EXTRA_DOGS = 2;

      await Promise.all(
        Array.from({ length: LIMIT + EXTRA_DOGS }).map(() =>
          generateFakeUserWithDog({
            gender: Gender.FEMALE
          })
        )
      );

      const fullPotentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        []
      );

      expect(fullPotentialMatches).toHaveLength(10);
    });

    it("throws an error if dog user ID is not provided", async () => {
      const dog = {} as Dog;

      await expect(
        SuggestionService.getPotentialMatches(dog, LIMIT, [])
      ).rejects.toThrow("User ID is required");
    });

    it("returns dogs ordered by distance", async () => {
      const [
        { dog },
        { dog: farDog },
        { dog: withoutLocation },
        { dog: nearDog }
      ] = await Promise.all([
        generateFakeUserWithDog(
          { gender: Gender.MALE },
          { latitude: 0, longitude: 0 }
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { latitude: 10, longitude: 10 }
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { latitude: undefined, longitude: undefined }
        ),
        generateFakeUserWithDog(
          { gender: Gender.FEMALE },
          { latitude: 1, longitude: 1 }
        )
      ]);

      const potentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        []
      );

      expect(potentialMatches).toHaveLength(3);
      expect(potentialMatches[0]!.id).toEqual(nearDog.id);
      expect(potentialMatches[1]!.id).toEqual(farDog.id);
      expect(potentialMatches[2]!.id).toEqual(withoutLocation.id);
    });

    test("swiped dogs are not returned", async () => {
      const { dog } = await generateFakeUserWithDog({
        gender: Gender.MALE
      });
      const { dog: swipedDog } = await generateFakeUserWithDog({
        gender: Gender.FEMALE
      });

      const firstPotentialMatches = await SuggestionService.getPotentialMatches(
        dog,
        LIMIT,
        []
      );

      expect(firstPotentialMatches[0]?.id).toEqual(swipedDog.id);

      // Simulate a swipe
      await SwipeService.createOrUpdateInterest(
        dog.id,
        swipedDog.id,
        SwipeType.INTERESTED
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
            { longitude: 0, latitude: 0 }
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { plan: PlanType.FREE, longitude: 0, latitude: 0 } // Free is closer
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { plan: PlanType.PREMIUM, longitude: 1, latitude: 1 } // But premium should have priority
          )
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
          SwipeType.INTERESTED
        ),
        SwipeService.createOrUpdateInterest(
          nonPremiumDog.id,
          dog.id,
          SwipeType.INTERESTED
        )
      ]);

      const afterLikesPotentialMatches =
        await SuggestionService.getPotentialMatches(dog, LIMIT, []);

      // Check that the first potential match is the premium user
      expect(afterLikesPotentialMatches[0]!.id).toEqual(premiumDog.id);
    });

    describe("Preferences", () => {
      test("gender", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
          generateFakeUserWithDog({ gender: Gender.FEMALE }),
          generateFakeUserWithDog({ gender: Gender.MALE })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);

        expect(potentialMatches[0]?.gender).toEqual(Gender.MALE);
      });

      test("size", async () => {
        const numberOfMediumDogs = 2;

        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: Gender.MALE,
            size: Size.SMALL,
            preferredSize: Size.MEDIUM
          }),
          generateFakeUserWithDog({ gender: Gender.FEMALE, size: Size.GIANT }),
          Array.from({ length: numberOfMediumDogs }).map(() =>
            generateFakeUserWithDog({
              gender: Gender.FEMALE,
              size: Size.MEDIUM
            })
          ),
          generateFakeUserWithDog({ gender: Gender.FEMALE, size: Size.SMALL }),
          generateFakeUserWithDog({ gender: Gender.FEMALE, size: Size.LARGE })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(numberOfMediumDogs);
      });

      test("color", async () => {
        const numberOfGoldenDogs = 2;

        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: Gender.MALE,
            color: Color.BROWN,
            preferredColor: Color.GOLDEN
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            color: Color.BLACK
          }),
          Array.from({ length: numberOfGoldenDogs }).map(() =>
            generateFakeUserWithDog({
              gender: Gender.FEMALE,
              color: Color.GOLDEN
            })
          ),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            color: Color.WHITE
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            color: Color.TRICOLOR
          })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(numberOfGoldenDogs);
        expect(
          potentialMatches.every((match) => match?.color === Color.GOLDEN)
        );
      });

      test("age", async () => {
        const preferredMinAge = 2;
        const preferredMaxAge = 4;

        const getBirthDateByAge = (age: number) =>
          new Date(
            new Date().setFullYear(new Date().getFullYear() - age)
          ).toISOString();

        const [{ dog }, { dog: preferredAgeDog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: Gender.MALE,
            preferredMinAge,
            preferredMaxAge
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            birthDate: getBirthDateByAge(preferredMinAge)
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            birthDate: getBirthDateByAge(preferredMaxAge + 1)
          }),
          generateFakeUserWithDog({
            gender: Gender.FEMALE,
            birthDate: getBirthDateByAge(preferredMinAge - 1)
          })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);
        expect(potentialMatches[0]!.id).toEqual(preferredAgeDog.id);
      });

      test("distance", async () => {
        const preferredMaxDistance = 10; // in kilometers

        const [{ dog }, { dog: nearDog }] = await Promise.all([
          generateFakeUserWithDog(
            { gender: Gender.MALE, preferredMaxDistance },
            { latitude: 0, longitude: 0 }
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.05, longitude: 0.05 } // approximately 7 km away
          ),
          generateFakeUserWithDog(
            { gender: Gender.FEMALE },
            { latitude: 0.2, longitude: 0.2 } // approximately 28 km away
          )
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);
        expect(potentialMatches[0]!.id).toEqual(nearDog.id);
      });
      test("breed", async () => {
        const preferredBreedId = faker.helpers.arrayElement(breedData).id!;
        const nonPreferredBreedId = faker.helpers.arrayElement(
          breedData.filter((breed) => breed.id !== preferredBreedId)
        ).id!;

        const [{ dog }, { dog: sameBreedDog }] = await Promise.all([
          generateFakeUserWithDog({ gender: "MALE" }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            breed: { connect: { id: preferredBreedId } }
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            breed: { connect: { id: nonPreferredBreedId } }
          })
        ]);

        // Get potential matches
        const firstPotentialMatches =
          await SuggestionService.getPotentialMatches(dog, LIMIT, []);

        expect(firstPotentialMatches).toHaveLength(2);

        // Update the dog's preferred breed
        const updatedDog = await prisma.dog.update({
          where: { id: dog.id },
          data: { preferredBreedId }
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
            gender: "MALE"
          }),
          generateFakeUserWithDog({
            gender: "FEMALE"
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: {
                position: 0,
                status: IMAGE_STATUS.REJECTED,
                url: faker.image.urlLoremFlickr()
              }
            }
          })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);
      });

      it("does not return dogs with no approved images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE"
          }),
          generateFakeUserWithDog({
            gender: "FEMALE"
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: {
                position: 0,
                status: IMAGE_STATUS.PENDING,
                url: faker.image.urlLoremFlickr()
              }
            }
          })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);
      });

      it("does not return dogs with no images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE"
          }),
          generateFakeUserWithDog({
            gender: "FEMALE"
          }),
          generateFakeUserWithDog({
            gender: "FEMALE",
            images: {
              create: undefined
            }
          })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);
      });

      it("does not return pending images", async () => {
        const [{ dog }] = await Promise.all([
          generateFakeUserWithDog({
            gender: "MALE"
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
                    url: faker.image.urlLoremFlickr()
                  },
                  {
                    position: 1,
                    status: IMAGE_STATUS.APPROVED,
                    url: faker.image.urlLoremFlickr()
                  }
                ]
              }
            }
          })
        ]);

        const potentialMatches = await SuggestionService.getPotentialMatches(
          dog,
          LIMIT,
          []
        );

        expect(potentialMatches).toHaveLength(1);
        expect(potentialMatches[0]!.images).toHaveLength(1);
      });
    });
  });
});
