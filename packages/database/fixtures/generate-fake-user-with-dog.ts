import type { Prisma } from "@prisma/client";

import { randomUUID } from "node:crypto";

import { PlanType } from "@prisma/client";

import prisma from "..";
import { breedData } from "./breed-data";

type CreateUser = Parameters<typeof prisma.user.create>[0];

const coordinateBetween = (min: number, max: number) =>
  Number((min + Math.random() * (max - min)).toFixed(6));

export const generateFakeUserWithDog = async (
  dogData?: Partial<Prisma.DogCreateNestedManyWithoutUserInput["create"]>,
  userData?: Partial<CreateUser["data"]>,
  _withBlurHash = false,
) => {
  // oxlint-disable-next-line no-unassigned-vars -- assigned in commented-out code below (kept as stub for future blurhash work)
  let blurhash: string | undefined;

  const fixtureId = randomUUID();
  const url = `https://loremflickr.com/1920/1080/dogs?lock=${fixtureId}`;

  // if (withBlurHash) {
  //   const urlArrayBuffer = await fetch(url).then((res) => res.arrayBuffer())

  //   blurhash = await ImageService.createBlurhash({
  //     arrayBuffer: urlArrayBuffer,
  //   })
  // }

  const user = await prisma.user.create({
    data: {
      email: `dog-${fixtureId}@test.invalid`,
      latitude: coordinateBetween(-14, -13),
      longitude: coordinateBetween(-39, -38),
      state: "Bahia",
      city: "Salvador",
      country: "Brazil",
      plan: PlanType.FREE,
      ...userData,
      dogs: {
        create: {
          name: `Dog ${fixtureId.slice(0, 8)}`,
          gender: Math.random() > 0.5 ? "MALE" : "FEMALE",
          bio: "Friendly dog looking for new friends.",
          images: {
            create: {
              position: 0,
              status: "APPROVED",
              blurhash,
              url,
            },
          },
          breed: {
            connect: { id: breedData[0]?.id ?? "" },
          },
          ...(dogData as Partial<Prisma.DogCreateWithoutUserInput>),
        },
      },
    },
    include: {
      dogs: {
        include: {
          images: true,
        },
      },
    },
  });

  const [dog] = user.dogs;
  if (!dog) throw new Error("Fake user was created without a dog");

  return { user, dog };
};
