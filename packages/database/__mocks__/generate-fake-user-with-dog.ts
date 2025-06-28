import type { Prisma } from "@prisma/client";
import { faker } from "@faker-js/faker";
import { PlanType } from "@prisma/client";

// import { ImageService } from '../../../packages/api/src/services/ImageService'
// import { IMAGE_STATUS } from '../../../packages/shared/schemas/dogSchema'
import { prisma } from "../index";
import { breedData } from "./breed-data";

type CreateUser = Parameters<typeof prisma.user.create>[0];
export const generateFakeUserWithDog = async (
  dogData?: Partial<Prisma.DogCreateNestedManyWithoutUserInput["create"]>,
  userData?: Partial<CreateUser["data"]>,
  _withBlurHash = false
) => {
  let blurhash: string | undefined;

  const url = faker.image.urlLoremFlickr({
    category: "dogs",
    width: (16 / 9) * 1080,
    height: 1080
  });

  // if (withBlurHash) {
  //   const urlArrayBuffer = await fetch(url).then((res) => res.arrayBuffer())

  //   blurhash = await ImageService.createBlurhash({
  //     arrayBuffer: urlArrayBuffer,
  //   })
  // }

  const user = await prisma.user.create({
    data: {
      email: faker.internet.email({
        provider: "test"
      }),
      latitude: faker.location.latitude({
        max: -13,
        min: -14,
        precision: 6
      }),
      longitude: faker.location.longitude({
        max: -38,
        min: -39,
        precision: 6
      }),
      state: faker.location.state(),
      city: faker.location.city(),
      country: faker.location.country(),
      plan: PlanType.FREE,
      ...userData,
      dogs: {
        create: {
          name: faker.person.firstName(),
          gender: Math.random() > 0.5 ? "MALE" : "FEMALE",
          bio: faker.lorem.paragraph(),
          images: {
            create: {
              position: 0,
              status: "APPROVED",
              blurhash,
              url
            }
          },
          breed: {
            connect: { id: faker.helpers.arrayElement(breedData).id }
          },
          ...(dogData as
            | Prisma.DogCreateNestedManyWithoutUserInput["create"]
            | undefined)
        }
      }
    },
    include: {
      dogs: {
        include: {
          images: true
        }
      }
    }
  });

  // `include` above guarantees `dogs` is part of the returned payload when `prisma` is configured
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime safety guard
  const dog = (user as typeof user & { dogs: { [index: number]: Prisma.Dog } })
    .dogs[0];

  if (!dog) {
    throw new Error("generateFakeUserWithDog: dog could not be created");
  }

  return {
    user,
    dog
  };
};
