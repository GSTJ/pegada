import type { DeckTier, dogSafeSchema } from "../../dtos/dog-dto";
import type { Dog } from "@prisma/client";
import type { Sql } from "@prisma/client/runtime/library";
import type { z } from "zod";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { Gender, PlanType, Prisma, SwipeType } from "@prisma/client";

import { captureEvent } from "../../shared/analytics";

type DogSafeSchema = z.infer<typeof dogSafeSchema>;

/** A row as it comes back from the deck query, tagged with the tier it came from. */
type DeckDog = DogSafeSchema & { deckTier: DeckTier };

/**
 * How long a pass keeps a dog out of the deck.
 *
 * It used to be thirty days, applied inline in the primary query, which meant a
 * pass was the only signal strong enough to empty a deck for a month. Fourteen
 * days is short enough that a small city refills, and the recycled dogs are now
 * held back to the last tier so they can never displace a dog nobody has seen.
 */
const PASS_COOLDOWN_DAYS = 14;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** The radii the supply probe counts, in kilometers. */
const SUPPLY_RADII_KM = [10, 25, 50] as const;

type SupplyCounts = {
  supply10km: number | null;
  supply25km: number | null;
  supply50km: number | null;
};

const UNKNOWN_SUPPLY: SupplyCounts = {
  supply10km: null,
  supply25km: null,
  supply50km: null,
};

export class SuggestionService {
  static #clusterizeByDistance(bucketRanges: number[]) {
    const caseExpression = [Prisma.sql`CASE `];

    // Handle null values
    caseExpression.push(
      Prisma.sql`WHEN "subquery"."distance" IS NULL THEN ${bucketRanges.length + 1} `,
    );

    // Handle the rest of the ranges
    for (const [index, range] of bucketRanges.entries()) {
      caseExpression.push(
        Prisma.sql`WHEN "subquery"."distance" < ${range} THEN ${index} `,
      );
    }

    // Handle values greater than the last range
    caseExpression.push(Prisma.sql`ELSE ${bucketRanges.length} END`);

    return Prisma.join(caseExpression, "");
  }

  // Store the clusterizeByDistance result
  static #clusterizedDistancesSql = SuggestionService.#clusterizeByDistance(
    // Bucket ranges in kilometers
    [10, 20, 30, 40, 50, 75, 100, 250, 500, 1000, 2500, 5000, 10000],
  );

  /** The one condition the fallback tiers are allowed to drop. */
  static #buildGenderCondition(dog: Dog) {
    return Prisma.sql`"Dog"."gender" = ${dog.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE}::"Gender"`;
  }

  /**
   * The preferences that describe the dog rather than where it is.
   *
   * A missing value on the other dog always passes: a profile with no size set
   * is unknown, not a mismatch, and dropping it would shrink the deck for a
   * reason the person who set the preference never asked for.
   */
  static #buildAttributeConditions(dog: Dog) {
    const conditions: Sql[] = [];

    if (dog.preferredColor) {
      /* If the dog has the preferred color or no color, include it in the results */
      conditions.push(
        Prisma.sql`("Dog"."color" = ${dog.preferredColor}::"Color" OR "Dog"."color" IS NULL)`,
      );
    }

    if (dog.preferredSize) {
      /* If the dog has the preferred size or no size, include it in the results */
      conditions.push(
        Prisma.sql`("Dog"."size" = ${dog.preferredSize}::"Size" OR "Dog"."size" IS NULL)`,
      );
    }

    if (dog.preferredMinAge || dog.preferredMaxAge) {
      const minAge = dog.preferredMinAge ?? 0;
      const maxAge = dog.preferredMaxAge ?? 100; // 100 years old is too old for a human, let alone a dog

      /* If the dog is within the preferred age range or has no birth date, include it in the results */
      conditions.push(
        Prisma.sql`(EXTRACT(YEAR FROM AGE(NOW(), "Dog"."birthDate")) BETWEEN ${minAge} AND ${maxAge} OR "Dog"."birthDate" IS NULL)`,
      );
    }

    if (dog.preferredBreedId) {
      /* If the dog is within the preferred breed or no breed, include it in the results */
      conditions.push(
        Prisma.sql`("Dog"."breedId" = ${dog.preferredBreedId} OR "Dog"."breedId" IS NULL)`,
      );
    }

    return conditions;
  }

  /**
   * The radius filter, or null when the person never set one.
   *
   * 295 km and up is treated as "anywhere" because that is where the slider
   * ends, so a query for it would only cost time.
   */
  static #buildRadiusCondition(dog: Dog) {
    if (!dog.preferredMaxDistance || dog.preferredMaxDistance >= 295) {
      return null;
    }

    /* If the dog is within the preferred distance or has no location, include it in the results */
    return Prisma.sql`(
      "MainUser"."longitude" IS NULL OR 
      "MainUser"."latitude" IS NULL OR 
      "User"."longitude" IS NULL OR 
      "User"."latitude" IS NULL OR 
      ST_DistanceSphere(
        ST_MakePoint("User"."longitude", "User"."latitude"), 
        ST_MakePoint("MainUser"."longitude", "MainUser"."latitude")
      ) / 1000 <= ${dog.preferredMaxDistance}
    )`;
  }

  /** Glues a tier's conditions onto the shared WHERE clause. */
  static #joinConditions(conditions: Sql[]) {
    if (conditions.length === 0) return Prisma.empty;
    return Prisma.join(conditions, " AND ", " AND ");
  }

  /**
   * Dogs this one has already judged, excluded outright.
   *
   * Used by every tier except the recycled one, so an old pass can only ever
   * come back at the very end of a page and never twice.
   */
  static #buildUnswipedCondition(dog: Dog) {
    return Prisma.sql`AND NOT EXISTS (
      SELECT 1 FROM "Interest"
      WHERE "requesterId" = ${dog.id}
      AND "responderId" = "Dog"."id"
      AND "swipeType" IN (
        ${SwipeType.NOT_INTERESTED}::"SwipeType",
        ${SwipeType.INTERESTED}::"SwipeType",
        ${SwipeType.MAYBE}::"SwipeType"
      )
    )`;
  }

  /** The mirror image: only dogs passed on long enough ago to be worth another look. */
  static #buildRecycledPassCondition(dog: Dog, passedBefore: Date) {
    return Prisma.sql`AND EXISTS (
      SELECT 1 FROM "Interest"
      WHERE "requesterId" = ${dog.id}
      AND "responderId" = "Dog"."id"
      AND "swipeType" = ${SwipeType.NOT_INTERESTED}::"SwipeType"
      AND "updatedAt" <= ${passedBefore}
    )
    AND NOT EXISTS (
      SELECT 1 FROM "Interest"
      WHERE "requesterId" = ${dog.id}
      AND "responderId" = "Dog"."id"
      AND "swipeType" IN (
        ${SwipeType.INTERESTED}::"SwipeType",
        ${SwipeType.MAYBE}::"SwipeType"
      )
    )`;
  }

  // Make distances less accurate for security reasons. Up to 1 decimal place is enough.
  static #anonimizeDistances(dogs: DeckDog[]) {
    return dogs.map((dog) => ({
      ...dog,
      distance: dog.distance ? Math.round(dog.distance * 10) / 10 : null,
    }));
  }

  /**
   * One page of one tier.
   *
   * Everything outside `preferences` and `swipeHistory` is a hard exclusion and
   * is identical in every tier: the viewer's own dog, deleted and banned dogs,
   * the photo gate, and the ids the client already holds.
   */
  static #queryTier({
    dog,
    excludeIds,
    limit,
    preferences,
    swipeHistory,
  }: {
    dog: Dog;
    excludeIds: string[];
    limit: number;
    preferences: Sql;
    swipeHistory: Sql;
  }) {
    const notInCondition =
      excludeIds.length > 0
        ? Prisma.sql`AND "Dog"."id" NOT IN (${Prisma.join(excludeIds)})`
        : Prisma.empty;

    return prisma.$queryRaw<DogSafeSchema[]>`
    /* Select all wanted columns from the subquery */
    SELECT 
      "id", 
      "bio", 
      "birthDate", 
      "color", 
      "gender", 
      "name", 
      "pedigreeProof", 
      "size", 
      "weight", 
      "hasPedigree", 
      "breed",
      "images",
      "distance",
      "user"
    FROM (
      /* Select the necessary columns from the Dog table */
      SELECT 
        "Dog"."id", 
        "Dog"."bio", 
        "Dog"."birthDate", 
        "Dog"."color", 
        "Dog"."gender", 
        "Dog"."name", 
        "Dog"."pedigreeProof", 
        "Dog"."size", 
        "Dog"."weight", 
        "Dog"."hasPedigree", 
        /* Kept out of the outer select: it only exists to break distance ties */
        "User"."lastActiveAt" AS "lastActiveAt",
        /* Create a JSON array of the images */
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', "Image"."id", 
                'url', "Image"."url", 
                'position', "Image"."position", 
                'blurhash', "Image"."blurhash"
              )
              ORDER BY "Image"."position" ASC
            )
            FROM "Image" 
            WHERE "Dog"."id" = "Image"."dogId"
            AND "Image"."status" = ${IMAGE_STATUS.APPROVED}::"ImageStatus"
          ), 
          '[]'
        ) AS "images",
        /* Create a JSON object for the dogs user */
        json_build_object('plan', "User"."plan") AS "user",
        /* Build the breed id and slug */
        CASE
          WHEN "Breed"."id" IS NULL THEN NULL ELSE
          json_build_object('id', "Breed"."id", 'slug', "Breed"."slug")
          END AS "breed",
        /* Calculate the distance between the user and the dog */
        CASE
          WHEN "User"."latitude" IS NULL OR "User"."longitude" IS NULL OR "MainUser"."latitude" IS NULL OR "MainUser"."longitude" IS NULL THEN NULL
          ELSE ST_DistanceSphere(ST_MakePoint("User"."longitude", "User"."latitude"), ST_MakePoint("MainUser"."longitude", "MainUser"."latitude")) / 1000
          END AS distance,
        /* Premium buys priority over the people who liked YOU — the
           "responderId" filter is what scopes it to this deck. Without it the
           subquery selected every requester in the table, so one premium dog
           who had liked anyone at all sorted to the top of everyone's stack. */
        CASE
          WHEN "User"."plan" = ${PlanType.PREMIUM}::"PlanType" AND "Dog"."id" IN (
            SELECT "requesterId" FROM "Interest"
            WHERE "responderId" = ${dog.id}
            AND "swipeType" IN (${SwipeType.INTERESTED}::"SwipeType", ${SwipeType.MAYBE}::"SwipeType")
            AND "deletedAt" IS NULL
          ) THEN 1
          ELSE 0
          END as priority
      /* Join the Dog table with the User table */
      FROM "Dog"
      LEFT JOIN "Breed" ON "Dog"."breedId" = "Breed"."id"
      JOIN "User" ON "Dog"."userId" = "User"."id"
      /* Join the User table with the MainUser table */
      JOIN "User" AS "MainUser" ON "MainUser"."id" = ${dog.userId}
      WHERE TRUE
      /* Exclude dogs already loaded on the client or already served on this page. */
      ${notInCondition}
      /* Never return the viewer's own dog. */
      AND "Dog"."id" <> ${dog.id}
      /* Exclude dogs that have been deleted */
      AND "Dog"."deletedAt" IS NULL
      AND "Dog"."banned" = false
      AND "User"."deletedAt" IS NULL
      /* Exclude dogs with any rejected images and no approved images. Shadowban */
      AND (
        EXISTS (
          SELECT 1 FROM "Image"
          WHERE "Image"."dogId" = "Dog"."id"
          AND "Image"."status" = ${IMAGE_STATUS.APPROVED}::"ImageStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Image"
          WHERE "Image"."dogId" = "Dog"."id"
          AND "Image"."status" = ${IMAGE_STATUS.REJECTED}::"ImageStatus"
        )
      )
      /* What this tier does about dogs already swiped on */
      ${swipeHistory}
      /* Add additional conditions based on the preferences of the dog and user */
      ${preferences}
    ) AS subquery
    
    /* Priority first, then how close, then who was here most recently */
    ORDER BY priority DESC, ${SuggestionService.#clusterizedDistancesSql} ASC, "lastActiveAt" DESC NULLS LAST
    /* Limit the number of results to the specified limit */
    LIMIT ${limit}
  `;
  }

  /**
   * How many dogs exist near this one at all, before any preference is applied.
   *
   * This is the denominator the deck never had. A short deck can mean the
   * filters are too tight or it can mean the city is empty, and the two need
   * completely different fixes.
   *
   * It is only asked on a short deck. The counts scan every dog and every
   * image, which is around 175 ms on a table this size, and a full page has
   * already answered the only question they exist to settle.
   */
  static async #getSupplyCounts(dog: Dog): Promise<SupplyCounts> {
    const [near, mid, far] = SUPPLY_RADII_KM;

    const [row] = await prisma.$queryRaw<
      {
        hasLocation: boolean | null;
        within10: number;
        within25: number;
        within50: number;
      }[]
    >`
      WITH "main" AS (
        SELECT "latitude", "longitude" FROM "User" WHERE "id" = ${dog.userId}
      ),
      "eligible" AS (
        SELECT
          ST_DistanceSphere(
            ST_MakePoint("User"."longitude", "User"."latitude"),
            ST_MakePoint("main"."longitude", "main"."latitude")
          ) / 1000 AS "distance"
        FROM "Dog"
        JOIN "User" ON "Dog"."userId" = "User"."id"
        CROSS JOIN "main"
        WHERE "Dog"."id" <> ${dog.id}
        AND "Dog"."deletedAt" IS NULL
        AND "Dog"."banned" = false
        AND "User"."deletedAt" IS NULL
        AND "User"."latitude" IS NOT NULL
        AND "User"."longitude" IS NOT NULL
        AND "main"."latitude" IS NOT NULL
        AND "main"."longitude" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "Image"
          WHERE "Image"."dogId" = "Dog"."id"
          AND "Image"."status" = ${IMAGE_STATUS.APPROVED}::"ImageStatus"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Image"
          WHERE "Image"."dogId" = "Dog"."id"
          AND "Image"."status" = ${IMAGE_STATUS.REJECTED}::"ImageStatus"
        )
      )
      SELECT
        (
          SELECT "latitude" IS NOT NULL AND "longitude" IS NOT NULL FROM "main"
        ) AS "hasLocation",
        COUNT(*) FILTER (WHERE "distance" <= ${near})::int AS "within10",
        COUNT(*) FILTER (WHERE "distance" <= ${mid})::int AS "within25",
        COUNT(*) FILTER (WHERE "distance" <= ${far})::int AS "within50"
      FROM "eligible"
    `;

    if (!row?.hasLocation) return UNKNOWN_SUPPLY;

    return {
      supply10km: row.within10,
      supply25km: row.within25,
      supply50km: row.within50,
    };
  }

  /** Counts a page by tier without walking the list four times. */
  static #countByTier(deck: DeckDog[], tier: DeckTier) {
    return deck.filter((entry) => entry.deckTier === tier).length;
  }

  /**
   * The supply probe and the event are both best effort. A deck that was
   * already built is not worth failing over a number nobody is waiting on.
   *
   * The event goes out on every page. The probe behind it does not: it only
   * runs when the page came back short, which is the only case where the
   * answer changes what anyone would do about it.
   */
  static async #reportDeckServed({
    dog,
    deck,
    radiusKm,
    requested,
  }: {
    dog: Dog;
    deck: DeckDog[];
    radiusKm: number | null;
    requested: number;
  }) {
    if (!dog.userId) return;

    try {
      const served = deck.length;

      const supply =
        served < requested
          ? await SuggestionService.#getSupplyCounts(dog)
          : UNKNOWN_SUPPLY;

      captureEvent(dog.userId, ANALYTICS_EVENTS.DECK_SERVED, {
        beyond_radius_count: SuggestionService.#countByTier(
          deck,
          "beyond_radius",
        ),
        empty: served === 0,
        primary_count: SuggestionService.#countByTier(deck, "primary"),
        radius_km: radiusKm,
        recycled_count: SuggestionService.#countByTier(deck, "recycled_pass"),
        requested,
        same_gender_count: SuggestionService.#countByTier(deck, "same_gender"),
        served,
        supply_10km: supply.supply10km,
        supply_25km: supply.supply25km,
        supply_50km: supply.supply50km,
      });
    } catch {
      // A missing row in a chart, not a missing deck.
    }
  }

  /**
   * One page of the deck, filled from the strictest tier down.
   *
   * The primary tier is the deck as it always was. Only when it comes back
   * short do the fallbacks run, each one relaxing exactly one thing and each
   * one limited to what is still missing, so a person with a full deck pays for
   * nothing and a person with an empty one gets dogs instead of a dead end.
   */
  static async getPotentialMatches(
    dog: Dog,
    limit: number,
    notIn: string[],
    // Widened to the schema on purpose: `deckTier` is optional there, so the
    // deck and `dog.get` stay one type on the client rather than two that
    // differ by a field the app is free to ignore.
  ): Promise<DogSafeSchema[]> {
    if (!dog?.userId) {
      throw new Error("User ID is required");
    }

    const genderCondition = SuggestionService.#buildGenderCondition(dog);
    const attributeConditions =
      SuggestionService.#buildAttributeConditions(dog);
    const radiusCondition = SuggestionService.#buildRadiusCondition(dog);
    const radiusConditions = radiusCondition ? [radiusCondition] : [];

    const unswiped = SuggestionService.#buildUnswipedCondition(dog);
    const recycled = SuggestionService.#buildRecycledPassCondition(
      dog,
      new Date(Date.now() - PASS_COOLDOWN_DAYS * DAY_IN_MS),
    );

    const plans: { preferences: Sql; swipeHistory: Sql; tier: DeckTier }[] = [
      {
        preferences: SuggestionService.#joinConditions([
          genderCondition,
          ...attributeConditions,
          ...radiusConditions,
        ]),
        swipeHistory: unswiped,
        tier: "primary",
      },
      // Only worth a round trip when a radius is what held the primary back.
      ...(radiusCondition
        ? [
            {
              preferences: SuggestionService.#joinConditions([
                genderCondition,
                ...attributeConditions,
              ]),
              swipeHistory: unswiped,
              tier: "beyond_radius" as const,
            },
          ]
        : []),
      {
        preferences: SuggestionService.#joinConditions([
          ...attributeConditions,
          ...radiusConditions,
        ]),
        swipeHistory: unswiped,
        tier: "same_gender",
      },
      {
        preferences: SuggestionService.#joinConditions([
          genderCondition,
          ...attributeConditions,
          ...radiusConditions,
        ]),
        swipeHistory: recycled,
        tier: "recycled_pass",
      },
    ];

    const deck: DeckDog[] = [];
    const excludeIds = [...notIn];

    for (const plan of plans) {
      const remaining = limit - deck.length;
      if (remaining <= 0) break;

      // oxlint-disable-next-line no-await-in-loop -- Each tier excludes what the one before it served, so they cannot run in parallel without serving the same dog twice.
      const rows = await SuggestionService.#queryTier({
        dog,
        excludeIds,
        limit: remaining,
        preferences: plan.preferences,
        swipeHistory: plan.swipeHistory,
      });

      for (const row of rows) {
        deck.push({ ...row, deckTier: plan.tier });
        excludeIds.push(row.id);
      }
    }

    await SuggestionService.#reportDeckServed({
      deck,
      dog,
      // The radius that was actually applied. A slider parked at the far end
      // filters nothing and skips the beyond radius tier, so reporting the raw
      // preference there would describe a deck that was never narrowed.
      radiusKm: radiusCondition ? (dog.preferredMaxDistance ?? null) : null,
      requested: limit,
    });

    return SuggestionService.#anonimizeDistances(deck);
  }
}
