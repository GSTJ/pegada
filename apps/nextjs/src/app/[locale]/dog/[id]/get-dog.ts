import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { cache } from "react";

import prisma from "@pegada/database";
import { Namespace } from "@pegada/shared/i18n/types/types";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { getFormattedYears } from "@pegada/shared/utils/get-formatted-years";

import { t } from "@/lib/translate";

/**
 * Shared by the page's `generateMetadata` and the page body: both render
 * within the same request, so `cache()` collapses them into a single Prisma
 * query instead of two. `opengraph-image.tsx` is fetched by scrapers as its
 * own separate HTTP request, so it makes its own query regardless.
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
      gender: true,
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

/**
 * pt-BR needs a gendered article ("O Rex" / "A Bella") that English has no
 * use for. `gender` is a required column, not inferred from the name, so
 * this is safe to key off directly.
 */
export const getDogArticle = (dog: Dog) =>
  dog.gender === "FEMALE" ? "A" : "O";

/**
 * Same article as `getDogArticle`, lowercased for mid-sentence use ("Curtir
 * a Bella") where the sentence-initial capital would be wrong.
 */
export const getDogArticleLowercase = (dog: Dog) =>
  getDogArticle(dog).toLowerCase();

/**
 * "quem cuida dela" / "quem cuida dele" (pt-BR) and "looks after her" /
 * "looks after him" (English) both need a gendered object pronoun, keyed
 * off the required `gender` column.
 */
export const getDogPronoun = (dog: Dog, lng: string) => {
  const isPtBr = lng.toLowerCase().startsWith("pt");

  if (isPtBr) return dog.gender === "FEMALE" ? "dela" : "dele";

  return dog.gender === "FEMALE" ? "her" : "him";
};

/**
 * "Ela quer fazer amigos" / "Ele quer fazer amigos" (pt-BR) and "She wants"
 * / "He wants" (English): a sentence-initial subject pronoun, so it comes
 * back capitalized. Keyed off the required `gender` column.
 */
export const getDogSubjectPronoun = (dog: Dog, lng: string) => {
  const isPtBr = lng.toLowerCase().startsWith("pt");

  if (isPtBr) return dog.gender === "FEMALE" ? "Ela" : "Ele";

  return dog.gender === "FEMALE" ? "She" : "He";
};

/** "Golden Retriever • 2 anos" — skips whichever half is missing. */
export const getDogTagline = (dog: Dog, lng: string) => {
  const breedName = dog.breed
    ? t(dog.breed.slug as BreedSlug, { ns: Namespace.Breed, lng })
    : undefined;
  const age = dog.birthDate
    ? getFormattedYears({ birthDate: dog.birthDate, lng })
    : undefined;

  return [breedName, age].filter(Boolean).join(" • ");
};

/** Meta description: tagline + bio, then a fixed CTA-ish suffix. */
export const getDogDescription = (dog: Dog, lng: string) => {
  const suffix = t("dog.metadata.descriptionSuffix", { name: dog.name, lng });
  const lead = [getDogTagline(dog, lng), dog.bio]
    .filter(Boolean)
    .join(" — ")
    .replace(/[.\s]+$/, "");

  return lead ? `${lead}. ${suffix}` : suffix;
};
