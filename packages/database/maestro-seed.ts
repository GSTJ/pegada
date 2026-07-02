/**
 * Maestro E2E seed — idempotent setup for the .maestro flows.
 *
 * The default `seed.ts` builds a generic Pitoca/Pitoco fixture for local dev.
 * Maestro flows need a more specific shape:
 *
 *   1. APPLE_MAGIC_EMAIL (test@pegada.app) — the long-lived returning user
 *      with a Rex dog, a Bella match with chat history, and a MatchMe dog that
 *      has already pre-liked Rex. Required by every non-destructive flow.
 *
 *   2. delete-me@pegada.app — a disposable account used ONLY by the
 *      delete-account journey (27-delete-account-journey.yaml). It must be
 *      re-created before each delete-account run because the flow hard-deletes
 *      it. Sharing #1 would blow away the seeded Dog/Match/chats.
 *
 * The API treats APPLE_MAGIC_EMAIL as a comma-separated list (see
 * packages/api/src/shared/config.ts → isMagicEmail). CI must set
 * APPLE_MAGIC_EMAIL="test@pegada.app,delete-me@pegada.app" so the OTP
 * bypass accepts both addresses.
 *
 * MatchMe is co-located with Rex in San Francisco so the SuggestionService
 * orders her FIRST (ORDER BY distance ASC). All 100 random fake users from
 * the default seed live in Brazil (~9000km away from SF).
 *
 * Run AFTER the default seed (or against a fresh DB seeded via
 * `pnpm database db:seed`) — this script is purely additive and idempotent:
 * re-runs upsert existing rows rather than duplicating them.
 *
 *   pnpm -F @pegada/database tsx maestro-seed.ts            # seed all
 *   pnpm -F @pegada/database tsx maestro-seed.ts seed-delete-me
 *   pnpm -F @pegada/database tsx maestro-seed.ts purge-delete-me
 *   pnpm -F @pegada/database tsx maestro-seed.ts check-delete-me
 */

import { createId } from "@paralleldrive/cuid2";
import { PlanType } from "@prisma/client";

import prisma from ".";
import { breedData } from "./__mocks__/breed-data";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const SF = { lat: 37.7749, lon: -122.4194 };
const GOLDEN_ID = "u8y4cc4hrg3fzy9lxwn3rrdd";

export const DELETE_ME_EMAIL = "delete-me@pegada.app";

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

// ---------------------------------------------------------------------------
// Rex / Bella / MatchMe seed (non-destructive flows)
// ---------------------------------------------------------------------------

async function ensureBreed() {
  await prisma.breed.upsert({
    where: { id: GOLDEN_ID },
    update: {},
    create: { id: GOLDEN_ID, name: "Golden Retriever", slug: "golden-retriever" },
  });
}

async function ensureMagicUserWithRex() {
  const magic = await prisma.user.upsert({
    where: { email: "test@pegada.app" },
    update: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    create: {
      email: "test@pegada.app",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    include: { dogs: true },
  });

  let rex = await prisma.dog.findFirst({
    where: { userId: magic.id, name: "Rex", deletedAt: null },
  });

  if (!rex) {
    rex = await prisma.dog.create({
      data: {
        userId: magic.id,
        name: "Rex",
        gender: "MALE",
        color: "GOLDEN",
        size: "LARGE",
        weight: 30,
        breedId: GOLDEN_ID,
        birthDate: yearsAgo(3),
        bio: "Friendly Rex looking for playmates in SF.",
        preferredMinAge: 1,
        preferredMaxAge: 15,
        preferredMaxDistance: 50,
        images: {
          create: {
            position: 0,
            status: "APPROVED",
            url: "https://placedog.net/640/480?id=1",
          },
        },
      },
    });
  } else {
    rex = await prisma.dog.update({
      where: { id: rex.id },
      data: {
        preferredMinAge: 1,
        preferredMaxAge: 15,
        preferredMaxDistance: 50,
      },
    });
  }

  return { magic, rex };
}

async function ensureBellaWithMatch(rexId: string) {
  const bellaUser = await prisma.user.upsert({
    where: { email: "test+bella@pegada.app" },
    update: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    create: {
      email: "test+bella@pegada.app",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    include: { dogs: { where: { deletedAt: null } } },
  });

  let bella = bellaUser.dogs[0];
  if (!bella) {
    bella = await prisma.dog.create({
      data: {
        userId: bellaUser.id,
        name: "Bella",
        gender: "FEMALE",
        color: "GOLDEN",
        size: "MEDIUM",
        weight: 20,
        breedId: GOLDEN_ID,
        birthDate: yearsAgo(2),
        bio: "Bella here — love long walks at the park.",
        images: {
          create: {
            position: 0,
            status: "APPROVED",
            url: "https://placedog.net/640/480?id=2",
          },
        },
      },
    });
  }

  let match = await prisma.match.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { requesterId: rexId, responderId: bella.id },
        { requesterId: bella.id, responderId: rexId },
      ],
    },
  });
  if (!match) {
    match = await prisma.match.create({
      data: { requesterId: rexId, responderId: bella.id },
    });
    await prisma.interest.create({
      data: {
        requesterId: rexId,
        responderId: bella.id,
        swipeType: "INTERESTED",
        matchId: match.id,
      },
    });
  }

  const existing = await prisma.message.count({
    where: { matchId: match.id, deletedAt: null },
  });
  if (existing < 2) {
    const now = Date.now();
    await prisma.message.deleteMany({ where: { matchId: match.id } });
    await prisma.message.create({
      data: {
        content: "Hey Bella! Want to meet up at the dog park?",
        senderId: rexId,
        receiverId: bella.id,
        matchId: match.id,
        createdAt: new Date(now - 1000 * 60 * 30),
      },
    });
    await prisma.message.create({
      data: {
        content: "Hi Rex! Yes, that sounds great. How about 3pm?",
        senderId: bella.id,
        receiverId: rexId,
        matchId: match.id,
        createdAt: new Date(now - 1000 * 60 * 5),
      },
    });
  }

  return { bellaUser, bella, match };
}

/**
 * MatchMe: a FEMALE dog whose owner has already swiped INTERESTED on Rex.
 *
 * - Co-located with Rex in San Francisco (~0km), so SuggestionService orders
 *   her FIRST in Rex's stack (the other 100 random seed dogs are in Brazil).
 * - The pre-existing Interest row (requesterId=matchMe, responderId=rex) is
 *   what makes the swipe a real match: when Rex swipes INTERESTED, the
 *   SwipeService finds this mutual interest and creates a Match — the API
 *   responds with `{ match }`, the swipe saga pushes /new-match, and the
 *   NewMatch modal opens.
 *
 * Critically: MatchMe MUST NOT have any pre-existing match with Rex (we
 * want the match to be CREATED during the maestro run, not pre-seeded), and
 * Rex MUST NOT have any pre-existing Interest in the OTHER direction (the
 * swipe service's `notIn` filter would hide MatchMe from the swipe stack).
 */
async function ensureMatchMeWithPreLike(rexId: string) {
  // MatchMe's owner is marked PREMIUM so the SuggestionService priority
  // column evaluates to 1 (premium pre-liker), which forces MatchMe to the
  // TOP of Rex's swipe stack ahead of the new SwipeDog pool below — both
  // sets are co-located in SF (~0km) so they otherwise tie on distance,
  // and Postgres makes no guarantee about tie ordering.
  const matchMeUser = await prisma.user.upsert({
    where: { email: "test+matchme@pegada.app" },
    update: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
      plan: PlanType.PREMIUM,
    },
    create: {
      email: "test+matchme@pegada.app",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
      plan: PlanType.PREMIUM,
    },
    include: { dogs: { where: { deletedAt: null } } },
  });

  let matchMe = matchMeUser.dogs.find((d) => d.name === "MatchMe");
  if (!matchMe) {
    matchMe = await prisma.dog.create({
      data: {
        userId: matchMeUser.id,
        name: "MatchMe",
        gender: "FEMALE",
        color: "GOLDEN",
        size: "MEDIUM",
        weight: 18,
        breedId: GOLDEN_ID,
        birthDate: yearsAgo(2),
        bio: "MatchMe — pre-liked Rex, ready to match in maestro flow #22.",
        images: {
          create: {
            position: 0,
            status: "APPROVED",
            url: "https://placedog.net/640/480?id=22",
          },
        },
      },
    });
  }

  // Tear down any state from a previous run so the swipe stack and match
  // creation behave deterministically.
  await prisma.message.deleteMany({
    where: {
      match: {
        OR: [
          { requesterId: rexId, responderId: matchMe.id },
          { requesterId: matchMe.id, responderId: rexId },
        ],
      },
    },
  });
  await prisma.match.deleteMany({
    where: {
      OR: [
        { requesterId: rexId, responderId: matchMe.id },
        { requesterId: matchMe.id, responderId: rexId },
      ],
    },
  });
  await prisma.interest.deleteMany({
    where: {
      OR: [
        { requesterId: rexId, responderId: matchMe.id },
        { requesterId: matchMe.id, responderId: rexId },
      ],
    },
  });

  // The one-sided like: MatchMe → Rex. When Rex swipes INTERESTED on
  // MatchMe, SwipeService.checkForMutualInterest finds THIS row and creates
  // the real match.
  const preLike = await prisma.interest.create({
    data: {
      requesterId: matchMe.id,
      responderId: rexId,
      swipeType: "INTERESTED",
    },
  });

  return { matchMeUser, matchMe, preLike };
}

/**
 * SwipeDogN: a small pool of nearby dogs that keep Rex's swipe deck
 * populated AFTER MatchMe gets consumed by flow #22 (or any like in
 * flow #21). Without these, the deck would be empty as soon as Rex
 * swipes MatchMe — the 100 default-seed fake users live in Brazil
 * (~9000km from SF) and are filtered out by Rex's 50km
 * preferredMaxDistance.
 *
 * These dogs deliberately have NO reciprocal Interest, so swiping
 * INTERESTED on them never creates a match — flow #21 can exercise
 * like / dislike / maybe / report on a fresh card every step without
 * accidentally triggering the new-match modal.
 *
 * Stable names (SwipeDog1..SwipeDogN) and email addresses make the
 * seed idempotent: re-runs upsert the same rows rather than
 * duplicating.
 */
const SWIPE_DOG_COUNT = 6;

async function ensureSwipePoolDogs(rexId: string) {
  const created: { name: string; id: string }[] = [];

  for (let i = 1; i <= SWIPE_DOG_COUNT; i++) {
    const email = `test+swipedog${i}@pegada.app`;
    const name = `SwipeDog${i}`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        city: "San Francisco",
        state: "CA",
        country: "USA",
        latitude: SF.lat,
        longitude: SF.lon,
      },
      create: {
        email,
        city: "San Francisco",
        state: "CA",
        country: "USA",
        latitude: SF.lat,
        longitude: SF.lon,
      },
      include: { dogs: { where: { deletedAt: null } } },
    });

    let dog = user.dogs.find((d) => d.name === name);
    if (!dog) {
      dog = await prisma.dog.create({
        data: {
          userId: user.id,
          name,
          // All FEMALE — Rex is MALE and the SuggestionService preference
          // filter shows ONLY opposite-gender dogs. Mixing in MALEs would
          // make half the pool invisible to Rex's stack.
          gender: "FEMALE",
          color: "GOLDEN",
          size: "MEDIUM",
          weight: 15 + i,
          breedId: GOLDEN_ID,
          birthDate: yearsAgo(2 + (i % 4)),
          bio: `${name} — nearby SF dog seeded to keep Rex's swipe stack populated.`,
          images: {
            create: {
              position: 0,
              status: "APPROVED",
              url: `https://placedog.net/640/480?id=${100 + i}`,
            },
          },
        },
      });
    }

    // Defensive: ensure NO reciprocal Interest exists from prior runs that
    // might have flipped one of these dogs into a match. Keeps swiping
    // INTERESTED on them inert (no new-match modal).
    await prisma.interest.deleteMany({
      where: {
        OR: [
          { requesterId: dog.id, responderId: rexId },
          { requesterId: rexId, responderId: dog.id },
        ],
      },
    });

    created.push({ name: dog.name, id: dog.id });
  }

  return created;
}

async function seedMain() {
  await ensureBreed();
  const { magic, rex } = await ensureMagicUserWithRex();
  const { bella, match } = await ensureBellaWithMatch(rex.id);
  const { matchMe, preLike } = await ensureMatchMeWithPreLike(rex.id);
  const swipePool = await ensureSwipePoolDogs(rex.id);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        magicUser: { id: magic.id, email: magic.email },
        rex: { id: rex.id, name: rex.name },
        bella: { id: bella.id, name: bella.name },
        bellaMatch: { id: match.id },
        matchMe: { id: matchMe.id, name: matchMe.name },
        matchMePreLike: { id: preLike.id, swipeType: preLike.swipeType },
        swipePool,
        messageCount: await prisma.message.count({
          where: { matchId: match.id, deletedAt: null },
        }),
      },
      null,
      2,
    ),
  );
}

// ---------------------------------------------------------------------------
// delete-me@pegada.app helpers (destructive flow only)
// ---------------------------------------------------------------------------

/**
 * Hard-delete the disposable account if it exists, then recreate it with a
 * minimal profile (User + Dog + one approved Image) so the auth router lands
 * on the swipe tabs after login. Idempotent — safe to call before every test
 * run, including after the previous run already deleted the account.
 */
export const seedDeleteMeUser = async () => {
  await purgeDeleteMeUser();

  const breed = breedData.find((b) => b.name === "Shih-tzu") ?? breedData[0];
  if (!breed?.id) {
    throw new Error("maestro-seed: no breed available to attach to delete-me dog");
  }

  // Upsert the breed row before connecting: on a fresh DB (db push
  // --force-reset + maestro:seed only) the Breed catalog from the main
  // `prisma db seed` doesn't exist yet, and the nested connect below
  // fails with P2025. Same self-sufficiency pattern as ensureBreed().
  await prisma.breed.upsert({
    where: { id: breed.id },
    update: {},
    create: { id: breed.id, name: breed.name, slug: breed.slug ?? "shih-tzu" },
  });

  const dogId = createId();
  await prisma.user.create({
    data: {
      email: DELETE_ME_EMAIL,
      city: "Ribeirão Preto",
      state: "SP",
      country: "BR",
      latitude: -21.1775,
      longitude: -47.8103,
      dogs: {
        create: {
          id: dogId,
          name: "DeleteMe",
          gender: "FEMALE",
          color: "BROWN",
          size: "SMALL",
          weight: 5,
          birthDate: new Date("2020-01-01"),
          bio: "Disposable Maestro account — recreated on every test run.",
          breed: { connect: { id: breed.id } },
          images: {
            create: {
              position: 0,
              status: "APPROVED",
              url: "https://placedog.net/640/480?id=42",
            },
          },
        },
      },
    },
  });
};

/**
 * Remove the delete-me user and everything that references it, in the
 * dependency order Prisma needs. Used both before re-seeding and as a
 * teardown verification helper for CI.
 */
export const purgeDeleteMeUser = async () => {
  const user = await prisma.user.findUnique({
    where: { email: DELETE_ME_EMAIL },
    select: { id: true, dogs: { select: { id: true } } },
  });
  if (!user) return;

  const dogIds = user.dogs.map((d) => d.id);

  await prisma.$transaction(async (tx) => {
    if (dogIds.length > 0) {
      await tx.message.deleteMany({
        where: {
          OR: [{ senderId: { in: dogIds } }, { receiverId: { in: dogIds } }],
        },
      });
      await tx.interest.deleteMany({
        where: {
          OR: [{ requesterId: { in: dogIds } }, { responderId: { in: dogIds } }],
        },
      });
      await tx.match.deleteMany({
        where: {
          OR: [{ requesterId: { in: dogIds } }, { responderId: { in: dogIds } }],
        },
      });
      await tx.image.deleteMany({ where: { dogId: { in: dogIds } } });
      await tx.dog.deleteMany({ where: { id: { in: dogIds } } });
    }
    await tx.user.delete({ where: { id: user.id } });
  });
};

/**
 * Verification helper: returns true iff the delete-me user row still exists.
 * Call this after the Maestro flow finishes to prove the in-app delete
 * actually reached the database.
 */
export const deleteMeExists = async (): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { email: DELETE_ME_EMAIL },
    select: { id: true },
  });
  return Boolean(user);
};

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMain = (() => {
  try {
    const url = new URL(import.meta.url);
    return process.argv[1] === url.pathname;
  } catch {
    return false;
  }
})();

if (isMain) {
  const command = process.argv[2] ?? "seed";

  const run = async () => {
    if (command === "seed") {
      await seedMain();
    } else if (command === "seed-delete-me") {
      await seedDeleteMeUser();
      // eslint-disable-next-line no-console
      console.log(`[maestro-seed] seeded ${DELETE_ME_EMAIL}`);
    } else if (command === "purge-delete-me") {
      await purgeDeleteMeUser();
      // eslint-disable-next-line no-console
      console.log(`[maestro-seed] purged ${DELETE_ME_EMAIL}`);
    } else if (command === "check-delete-me") {
      const exists = await deleteMeExists();
      // eslint-disable-next-line no-console
      console.log(`[maestro-seed] ${DELETE_ME_EMAIL} exists=${exists}`);
      if (exists) process.exit(1);
    } else {
      // eslint-disable-next-line no-console
      console.error(
        `[maestro-seed] unknown command "${command}" — use seed|seed-delete-me|purge-delete-me|check-delete-me`,
      );
      process.exit(1);
    }
  };

  run()
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
