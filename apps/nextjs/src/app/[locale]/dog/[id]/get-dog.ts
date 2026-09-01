import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { cache } from "react";

import prisma from "@pegada/database";
import { Namespace } from "@pegada/shared/i18n/types/types";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { getFormattedYears } from "@pegada/shared/utils/get-formatted-years";

import { t } from "@/lib/translate";

/**
 * Shared by the page's `generateMetadata`, the page body, and
 * `opengraph-image.tsx` — all three render for the same request, and
 * `cache()` collapses them into a single Prisma query instead of three.
 */
export const getDog = cache((id: string) => {
  return prisma.dog.findFirst({
    where: {
      id,
      banned: false,
      deletedAt: null,
      images: {
        some: { status: IMAGE_STATUS.APPROVED },
        none: { status: IMAGE_STATUS.REJECTED },
      },
    },
    select: {
      name: true,
      bio: true,
      birthDate: true,
      breed: { select: { name: true, slug: true } },
      images: {
        where: { status: IMAGE_STATUS.APPROVED },
        orderBy: { position: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });
});

export type Dog = NonNullable<Awaited<ReturnType<typeof getDog>>>;

export const getDogImage = (dog: Dog) => dog.images[0]?.url;

/** "Golden Retriever • 2 anos" — skips whichever half is missing. */
export const getDogTagline = (dog: Dog, lng: string) => {
  const breedName = dog.breed
    ? t(dog.breed.slug as BreedSlug, { ns: Namespace.Breed })
    : undefined;
  const age = dog.birthDate
    ? getFormattedYears({ birthDate: dog.birthDate, lng })
    : undefined;

  return [breedName, age].filter(Boolean).join(" • ");
};

/** Meta description: tagline + bio, then a fixed CTA-ish suffix. */
export const getDogDescription = (dog: Dog, lng: string) => {
  const suffix = t("dog.metadata.descriptionSuffix", { name: dog.name });
  const lead = [getDogTagline(dog, lng), dog.bio]
    .filter(Boolean)
    .join(" — ")
    .replace(/[.\s]+$/, "");

  return lead ? `${lead}. ${suffix}` : suffix;
};
