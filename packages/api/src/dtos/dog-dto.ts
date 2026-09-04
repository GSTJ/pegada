import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { config } from "../shared/config";

const breedSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
  })
  .nullable();

/**
 * Where a dog in the deck came from.
 *
 * `primary` is the deck as the person's preferences describe it. The rest are
 * refills, used only when the primary comes back short, and each one names the
 * single thing it relaxed so the app can say so on the card.
 */
export const DECK_TIERS = [
  "primary",
  "beyond_radius",
  "same_gender",
  "recycled_pass",
] as const;

export type DeckTier = (typeof DECK_TIERS)[number];

const dogImageSchema = z.object({
  id: z.string(),
  url: z.string(),
  position: z.number(),
  blurhash: z.string().nullable(),
});

export const dogSafeSchema = z
  .object({
    id: z.string(),
    bio: z.string().nullable(),
    breed: breedSchema,
    birthDate: z.date().nullable(),
    color: z.string().nullable(),
    // Optional so a build that predates the refill tiers still parses a deck.
    deckTier: z.enum(DECK_TIERS).optional(),
    gender: z.string(),
    distance: z.number().nullable(),
    images: z.array(dogImageSchema),
    name: z.string(),
    pedigreeProof: z.string().nullable(),
    size: z.string().nullable(),
    weight: z.number().nullable(),
    hasPedigree: z.boolean().nullable(),
    user: z.object({
      plan: z.string(),
    }),
  })
  .strict();

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
    where: { status: IMAGE_STATUS.APPROVED },
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
      plan: true,
    },
  },
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
      status: config.NODE_ENV === "development",
    },
  },
  user: {
    select: {
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      country: true,
      email: true,
    },
  },
  preferredBreedId: true,
  preferredColor: true,
  preferredMaxAge: true,
  preferredMaxDistance: true,
  preferredMinAge: true,
  preferredSize: true,
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
      status: true,
    },
  },
  user: {
    select: {
      latitude: true,
      longitude: true,
      city: true,
      state: true,
      country: true,
      email: true,
    },
  },
  preferredBreedId: true,
  preferredColor: true,
  preferredMaxAge: true,
  preferredMaxDistance: true,
  preferredMinAge: true,
  preferredSize: true,
});
