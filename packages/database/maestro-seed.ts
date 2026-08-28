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
 *   pnpm -F @pegada/database tsx maestro-seed.ts reset-match
 *   pnpm -F @pegada/database tsx maestro-seed.ts seed-delete-me
 *   pnpm -F @pegada/database tsx maestro-seed.ts purge-delete-me
 *   pnpm -F @pegada/database tsx maestro-seed.ts check-delete-me
 */

import { createId } from "@paralleldrive/cuid2";
import { PlanType } from "@prisma/client";

import prisma from ".";
import { breedData } from "./fixtures/breed-data";

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const SF = { lat: 37.7749, lon: -122.4194 };
const GOLDEN_ID = "u8y4cc4hrg3fzy9lxwn3rrdd";

export const DELETE_ME_EMAIL = "delete-me@pegada.app";

/** The long-lived returning user every non-destructive flow logs in as. */
const MAGIC_EMAIL = "test@pegada.app";
/** MatchMe's owner. Premium, so MatchMe sorts to the top of Rex's deck. */
const MATCHME_EMAIL = "test+matchme@pegada.app";
/** Rex's canonical bio. Named because the reset has to restore it, not only
 * the create has to set it. */
const REX_BIO = "Friendly Rex looking for playmates in SF.";

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

// ---------------------------------------------------------------------------
// Rex / Bella / MatchMe seed (non-destructive flows)
// ---------------------------------------------------------------------------

const ensureBreed = async () => {
  await prisma.breed.upsert({
    where: { id: GOLDEN_ID },
    update: {},
    create: {
      id: GOLDEN_ID,
      name: "Golden Retriever",
      slug: "golden-retriever",
    },
  });
};

const ensureMagicUserWithRex = async () => {
  const magic = await prisma.user.upsert({
    where: { email: MAGIC_EMAIL },
    update: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    create: {
      email: MAGIC_EMAIL,
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    include: { dogs: true },
  });

  // Find the magic user's dog by OWNERSHIP, not by name: flow 24 renames
  // Rex to "Rex-<ts>", and a name-based lookup would create a SECOND dog
  // for the account. The app then keeps swiping as the original (oldest)
  // dog while the seed purges/pre-likes the new one — the deck gets eaten
  // a little more every run and flow 22 eventually sees zero cards.
  let rex = await prisma.dog.findFirst({
    where: { userId: magic.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  // Any extra dogs (created by the old name-based lookup) are soft-deleted
  // so the account is back to exactly one dog.
  if (rex) {
    await prisma.dog.updateMany({
      where: { userId: magic.id, deletedAt: null, id: { not: rex.id } },
      data: { deletedAt: new Date() },
    });
  }

  if (rex) {
    rex = await prisma.dog.update({
      where: { id: rex.id },
      data: {
        name: "Rex",
        // `bio` and `preferredSize` are here because the flows and the tour
        // WRITE them — tour chunk 08 types into Bio and picks size Medium,
        // flow 24 edits both — and the pixel matrix compares the next
        // capture against a baseline taken before any of that. Leaving them
        // out is what produced the DATA rows in
        // .unistyles-migration/verify-r1/MATRIX-GATE.md: 05-profile off by
        // one line of bio, 06-preferences off by one row's value, and half
        // of 07-edit-profile. A field a test can change belongs in the
        // reset.
        bio: REX_BIO,
        preferredSize: null,
        preferredMinAge: 1,
        preferredMaxAge: 15,
        preferredMaxDistance: 50,
      },
    });
  } else {
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
        bio: REX_BIO,
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
  }

  return { magic, rex };
};

const ensureBellaWithMatch = async (rexId: string) => {
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

  let [bella] = bellaUser.dogs;
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
};

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
const ensureMatchMeWithPreLike = async (rexId: string) => {
  // MatchMe's owner is marked PREMIUM so the SuggestionService priority
  // column evaluates to 1 (premium pre-liker), which forces MatchMe to the
  // TOP of Rex's swipe stack ahead of the new SwipeDog pool below — both
  // sets are co-located in SF (~0km) so they otherwise tie on distance,
  // and Postgres makes no guarantee about tie ordering.
  const matchMeUser = await prisma.user.upsert({
    where: { email: MATCHME_EMAIL },
    update: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
      plan: PlanType.PREMIUM,
    },
    create: {
      email: MATCHME_EMAIL,
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

  // Additive only. The teardown that used to live here — deleting every
  // Match, Message and Interest between Rex and MatchMe — moved to
  // `resetMatchMePreLike` below, because it ran on EVERY flow's pre-test hook
  // and the dev Postgres is shared. Mid-capture, a concurrent flow's seed
  // hard-deleted the match a tour had just created: `message.send` started
  // answering 500 `Invalid matchId or senderId`, the chat rendered empty,
  // MatchMe disappeared from the Messages list and edit-profile values
  // reverted between chunks. It reads exactly like a chat regression and
  // cost an hour to attribute (.unistyles-migration/tour-android/MANIFEST.md,
  // "Environment trap").
  //
  // So the pre-like is created only when there is nothing to preserve.
  const existingPreLike = await prisma.interest.findFirst({
    where: { requesterId: matchMe.id, responderId: rexId },
  });

  const preLike =
    existingPreLike ??
    // The one-sided like: MatchMe → Rex. When Rex swipes INTERESTED on
    // MatchMe, SwipeService.checkForMutualInterest finds THIS row and creates
    // the real match.
    (await prisma.interest.create({
      data: {
        requesterId: matchMe.id,
        responderId: rexId,
        swipeType: "INTERESTED",
      },
    }));

  return { matchMeUser, matchMe, preLike };
};

/**
 * Put MatchMe back on Rex's swipe deck, destructively.
 *
 * Flow 22 needs to CREATE the Rex↔MatchMe match itself — its post-check
 * counts the row — so anything a previous run left behind has to go. That is
 * a real requirement and it is why this code exists; what it is not is
 * something every other flow should do on its way past. Run it from flow 22's
 * own pre-hook (`.maestro/scripts/pre/22-*.sh`), never from the shared seed.
 *
 * Narrow on purpose: only rows between these two dogs, nothing else.
 */
export const resetMatchMePreLike = async () => {
  const rex = await prisma.dog.findFirst({
    where: { user: { email: MAGIC_EMAIL }, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  const matchMe = await prisma.dog.findFirst({
    where: { user: { email: MATCHME_EMAIL }, name: "MatchMe", deletedAt: null },
  });

  if (!rex || !matchMe) {
    throw new Error(
      "resetMatchMePreLike: Rex or MatchMe is missing — run `maestro:seed` first",
    );
  }

  const between = {
    OR: [
      { requesterId: rex.id, responderId: matchMe.id },
      { requesterId: matchMe.id, responderId: rex.id },
    ],
  };

  await prisma.message.deleteMany({ where: { match: between } });
  await prisma.match.deleteMany({ where: between });
  await prisma.interest.deleteMany({ where: between });

  const preLike = await prisma.interest.create({
    data: {
      requesterId: matchMe.id,
      responderId: rex.id,
      swipeType: "INTERESTED",
    },
  });

  return { rex, matchMe, preLike };
};

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

const ensureSwipePoolDogs = async (rexId: string) => {
  const created: { name: string; id: string }[] = [];

  for (let i = 1; i <= SWIPE_DOG_COUNT; i++) {
    const email = `test+swipedog${i}@pegada.app`;
    const name = `SwipeDog${i}`;

    // Each SwipeDog sits STRICTLY farther from Rex than MatchMe (who is
    // exactly co-located at SF). The deck orders by `priority DESC,
    // distance ASC`, and priority=1 for pre-likers only applies to
    // PREMIUM users — for a FREE user, identical coordinates make the
    // order a Postgres tie-break (arbitrary, heap-dependent), and flow
    // 22 flakes whenever MatchMe isn't first. ~1.1km per index keeps a
    // stable SwipeDog1..6 order and everyone inside the 50km preference.
    const swipeDogLat = SF.lat + 0.01 * i;

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        city: "San Francisco",
        state: "CA",
        country: "USA",
        latitude: swipeDogLat,
        longitude: SF.lon,
      },
      create: {
        email,
        city: "San Francisco",
        state: "CA",
        country: "USA",
        latitude: swipeDogLat,
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
};

const seedMain = async () => {
  await ensureBreed();
  const { magic, rex } = await ensureMagicUserWithRex();
  const { bella, match } = await ensureBellaWithMatch(rex.id);
  const { matchMe, preLike } = await ensureMatchMeWithPreLike(rex.id);
  const swipePool = await ensureSwipePoolDogs(rex.id);

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
};

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
    throw new Error(
      "maestro-seed: no breed available to attach to delete-me dog",
    );
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
          OR: [
            { requesterId: { in: dogIds } },
            { responderId: { in: dogIds } },
          ],
        },
      });
      await tx.match.deleteMany({
        where: {
          OR: [
            { requesterId: { in: dogIds } },
            { responderId: { in: dogIds } },
          ],
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
    } else if (command === "reset-match") {
      const { rex, matchMe } = await resetMatchMePreLike();
      console.log(
        `[maestro-seed] reset the ${rex.name}<->${matchMe.name} match and re-created the pre-like`,
      );
    } else if (command === "seed-delete-me") {
      await seedDeleteMeUser();
      console.log(`[maestro-seed] seeded ${DELETE_ME_EMAIL}`);
    } else if (command === "purge-delete-me") {
      await purgeDeleteMeUser();
      console.log(`[maestro-seed] purged ${DELETE_ME_EMAIL}`);
    } else if (command === "check-delete-me") {
      const exists = await deleteMeExists();
      console.log(`[maestro-seed] ${DELETE_ME_EMAIL} exists=${exists}`);
      if (exists) process.exit(1);
    } else {
      console.error(
        `[maestro-seed] unknown command "${command}" — use seed|reset-match|seed-delete-me|purge-delete-me|check-delete-me`,
      );
      process.exit(1);
    }
  };

  run()
    .finally(() => prisma.$disconnect())
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
