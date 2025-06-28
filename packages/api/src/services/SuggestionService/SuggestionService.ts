import { Dog, Gender, PlanType, Prisma, SwipeType } from "@prisma/client";
import { Sql } from "@prisma/client/runtime/library";
import { z } from "zod";

import prisma from "@pegada/database";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { dogSafeSchema } from "../../dtos/dogDto";

type DogSafeSchema = z.infer<typeof dogSafeSchema>;
export class SuggestionService {
  static #clusterizeByDistance(bucketRanges: number[]) {
    const caseExpression = [Prisma.sql`CASE `];

    // Handle null values
    caseExpression.push(
      Prisma.sql`WHEN "subquery"."distance" IS NULL THEN ${bucketRanges.length + 1} `
    );

    // Handle the rest of the ranges
    bucketRanges.forEach((range, index) => {
      caseExpression.push(
        Prisma.sql`WHEN "subquery"."distance" < ${range} THEN ${index} `
      );
    });

    // Handle values greater than the last range
    caseExpression.push(Prisma.sql`ELSE ${bucketRanges.length} END`);

    return Prisma.join(caseExpression, "");
  }

  // Store the clusterizeByDistance result
  static #clusterizedDistancesSql = SuggestionService.#clusterizeByDistance(
    // Bucket ranges in kilometers
    [10, 20, 30, 40, 50, 75, 100, 250, 500, 1000, 2500, 5000, 10000]
  );

  static #buildPreferenceConditions(dog: Dog | null) {
    const conditions: Sql[] = [
      /* If the dog is the opposite gender, include it in the results */
      Prisma.sql`"Dog"."gender" = ${dog?.gender === Gender.MALE ? Gender.FEMALE : Gender.MALE}::"Gender"`
    ];

    if (dog?.preferredColor) {
      /* If the dog has the preferred color or no color, include it in the results */
      conditions.push(
        Prisma.sql`("Dog"."color" = ${dog.preferredColor}::"Color" OR "Dog"."color" IS NULL)`
      );
    }

    if (dog?.preferredSize) {
      /* If the dog has the preferred size or no size, include it in the results */
      conditions.push(
        Prisma.sql`("Dog"."size" = ${dog.preferredSize}::"Size" OR "Dog"."size" IS NULL)`
      );
    }

    if (dog?.preferredMinAge || dog?.preferredMaxAge) {
      const minAge = dog.preferredMinAge ?? 0;
      const maxAge = dog.preferredMaxAge ?? 100; // 100 years old is too old for a human, let alone a dog

      /* If the dog is within the preferred age range or has no birth date, include it in the results */
      conditions.push(
        Prisma.sql`(EXTRACT(YEAR FROM AGE(NOW(), "Dog"."birthDate")) BETWEEN ${minAge} AND ${maxAge} OR "Dog"."birthDate" IS NULL)`
      );
    }

    if (dog?.preferredBreedId) {
      /* If the dog is within the preferred breed or no breed, include it in the results */
      conditions.push(
        Prisma.sql`("Dog"."breedId" = ${dog.preferredBreedId} OR "Dog"."breedId" IS NULL)`
      );
    }

    if (dog?.preferredMaxDistance && dog?.preferredMaxDistance < 295) {
      /* If the dog is within the preferred distance or has no location, include it in the results */
      conditions.push(
        Prisma.sql`(
          "MainUser"."longitude" IS NULL OR 
          "MainUser"."latitude" IS NULL OR 
          "User"."longitude" IS NULL OR 
          "User"."latitude" IS NULL OR 
          ST_DistanceSphere(
            ST_MakePoint("User"."longitude", "User"."latitude"), 
            ST_MakePoint("MainUser"."longitude", "MainUser"."latitude")
          ) / 1000 <= ${dog.preferredMaxDistance}
        )`
      );
    }

    /** Concatenate all the contidional logic */
    return Prisma.join(conditions, " AND ", " AND ");
  }

  // Make distances less accurate for security reasons. Up to 1 decimal place is enough.
  static async #anonimizeDistances(dogs: DogSafeSchema[]) {
    return dogs.map((dog) => ({
      ...dog,
      distance: dog.distance ? Math.round(dog.distance * 10) / 10 : null
    }));
  }

  static async getPotentialMatches(dog: Dog, limit: number, notIn: string[]) {
    if (!dog?.userId) {
      throw new Error("User ID is required");
    }

    const notInString = notIn.map((id) => `'${id}'`).join(",");

    const potentialMatches = await prisma.$queryRaw<DogSafeSchema[]>`
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
        CASE
          WHEN "User"."plan" = ${PlanType.PREMIUM}::"PlanType" AND "Dog"."id" IN (
            SELECT "requesterId" FROM "Interest"
            WHERE "swipeType" IN (${SwipeType.INTERESTED}::"SwipeType", ${SwipeType.MAYBE}::"SwipeType")
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
      /* Exclude dogs that are in the notInString */
      WHERE "Dog"."id" NOT IN (${notInString})
      /* Exclude dogs that have been deleted */
      AND "Dog"."deletedAt" IS NULL
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
      /* Exclude dogs you have already liked or disliked (disliked in the last 30 days)*/
      AND NOT EXISTS (
        SELECT 1 FROM "Interest"
        WHERE "requesterId" = ${dog.id}
        AND "responderId" = "Dog"."id"
        AND (
          ("swipeType" = ${SwipeType.NOT_INTERESTED}::"SwipeType" AND "updatedAt" > NOW() - INTERVAL '30 DAY')
          OR "swipeType" = ${SwipeType.INTERESTED}::"SwipeType"
          OR "swipeType" = ${SwipeType.MAYBE}::"SwipeType"
        )
      )
      /* Add additional conditions based on the preferences of the dog and user */
      ${SuggestionService.#buildPreferenceConditions(dog)}
    ) AS subquery
    
    /* Order the results by priority in descending order and distance in ascending order */
    ORDER BY priority DESC, ${SuggestionService.#clusterizedDistancesSql} ASC
    /* Limit the number of results to the specified limit */
    LIMIT ${limit}
  `;

    return SuggestionService.#anonimizeDistances(potentialMatches);
  }
}
