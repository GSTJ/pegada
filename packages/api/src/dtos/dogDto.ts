import { Prisma } from "@prisma/client";

import {
  dogSafeSchema as _dogSafeSchema,
  IMAGE_STATUS
} from "@pegada/shared/schemas/dogSchema";

import { config } from "../shared/config";

export const dogSafeSchema = _dogSafeSchema;

/**
 * It's important to always explicitly say which fields you want to return in order to not leak extra information
 * @see https://github.com/prisma/prisma/issues/9353
 */
export const dogSelect = Prisma.validator<Prisma.DogSelect>()({
  id: true,
  bio: true,
  breed: true,
  birthDate: true,
  color: true,
  gender: true,
  images: {
    orderBy: { position: "asc" },
    select: { id: true, url: true, position: true, blurhash: true },
    // Only return approved images
    where: { status: IMAGE_STATUS.APPROVED }
  },
  name: true,
  pedigreeProof: true,
  size: true,
  weight: true,
  hasPedigree: true,
  user: {
    select: {
      latitude: true,
      longitude: true,
      plan: true
    }
  }
});

export const selfDogSelect = Prisma.validator<Prisma.DogSelect>()({
  ...dogSelect,
  images: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      url: true,
      position: true,
      blurhash: true,
      // We don't want to expose softbans to the client, but it's useful while developing
      status: config.NODE_ENV === "development" ? true : false
    }
  },
  user: {
    select: {
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      country: true,
      email: true
    }
  },
  preferredBreedId: true,
  preferredColor: true,
  preferredMaxAge: true,
  preferredMaxDistance: true,
  preferredMinAge: true,
  preferredSize: true
});

export const serverOnlyFullDogSelect = Prisma.validator<Prisma.DogSelect>()({
  ...dogSelect,
  images: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      url: true,
      position: true,
      blurhash: true,
      status: true
    }
  },
  user: {
    select: {
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      country: true,
      email: true
    }
  },
  preferredBreedId: true,
  preferredColor: true,
  preferredMaxAge: true,
  preferredMaxDistance: true,
  preferredMinAge: true,
  preferredSize: true
});
