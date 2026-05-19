/**
 * Maestro E2E seed — idempotent setup for the .maestro flows.
 *
 * The default `seed.ts` builds a generic Pitoca/Pitoco fixture for local dev.
 * Maestro flows need a more specific shape:
 *
 *   - The "magic" user `test@pegada.app` (APPLE_MAGIC_EMAIL) must exist with
 *     a Rex dog and a finished profile so `login-returning.yaml` lands on the
 *     swipe tab.
 *   - Bella must exist as a separate user with an active match + seeded chat
 *     history with Rex (required by `12-chat-conversation` and
 *     `19-chat-message-order`).
 *   - MatchMe must exist as a swipeable FEMALE dog whose owner has ALREADY
 *     liked Rex via a one-sided `Interest` row. When Rex swipes INTERESTED
 *     on MatchMe in `22-new-match-journey.yaml`, the swipe service finds the
 *     mutual interest and creates a real match, pushing the NewMatch modal.
 *
 * MatchMe is co-located with Rex in San Francisco so the SuggestionService
 * orders her FIRST (ORDER BY distance ASC). All 100 random fake users from
 * the default seed live in Brazil (~9000km away from SF), so distance
 * ordering reliably puts MatchMe at the top of Rex's stack.
 *
 * Run AFTER the default seed (or against a fresh DB seeded via
 * `pnpm database db:seed`) — this script is purely additive and idempotent:
 * re-runs upsert existing rows rather than duplicating them.
 *
 *   pnpm database tsx ./maestro-seed.ts
 */

import prisma from ".";

const SF = { lat: 37.7749, lon: -122.4194 };
const GOLDEN_ID = "u8y4cc4hrg3fzy9lxwn3rrdd";

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

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
  const matchMeUser = await prisma.user.upsert({
    where: { email: "test+matchme@pegada.app" },
    update: {
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
    },
    create: {
      email: "test+matchme@pegada.app",
      city: "San Francisco",
      state: "CA",
      country: "USA",
      latitude: SF.lat,
      longitude: SF.lon,
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
  // creation behave deterministically:
  //  - Delete any existing Match between Rex and MatchMe (we want the maestro
  //    swipe to CREATE the match for real).
  //  - Delete Rex's existing Interest in MatchMe (would mark MatchMe as
  //    already-swiped and exclude her from the suggestion stack).
  //  - Delete MatchMe's existing Interest in Rex so we can recreate it as
  //    the single source of truth for the mutual interest.
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

async function main() {
  await ensureBreed();
  const { magic, rex } = await ensureMagicUserWithRex();
  const { bella, match } = await ensureBellaWithMatch(rex.id);
  const { matchMe, preLike } = await ensureMatchMeWithPreLike(rex.id);

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
        messageCount: await prisma.message.count({
          where: { matchId: match.id, deletedAt: null },
        }),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
