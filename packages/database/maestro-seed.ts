/**
 * Maestro E2E seed — idempotent setup for the .maestro flows.
 *
 * The default `seed.ts` builds a generic Pitoca/Pitoco fixture for local dev.
 * Maestro flows need a more specific shape:
 *
 *   1. APPLE_MAGIC_EMAIL (test@pegada.app) — the long-lived returning user
 *      with a Rex dog, a Bella match with chat history, a Nina match with an
 *      empty thread and a four photo gallery, Mel on the deck, and a MatchMe
 *      dog that has already pre-liked Rex. Required by every non-destructive
 *      flow.
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
 * Every row this writes is keyed by a constant — `SEED_DOG_IDS` for the four
 * dogs the flows name out loud, the email address for their owners — and is
 * upserted, restored if a flow soft deleted it, and pruned back to the shape
 * below. Running it twice in a row leaves exactly the same database, on a
 * fresh install and on one that has been swiped, renamed and deleted against.
 *
 * Run AFTER the default seed (or against a fresh DB seeded via
 * `pnpm database db:seed`) — this script is purely additive.
 *
 *   pnpm -F @pegada/database tsx maestro-seed-cli.ts            # seed all
 *   pnpm -F @pegada/database tsx maestro-seed-cli.ts reset-match
 *   pnpm -F @pegada/database tsx maestro-seed-cli.ts seed-delete-me
 *   pnpm -F @pegada/database tsx maestro-seed-cli.ts purge-delete-me
 *   pnpm -F @pegada/database tsx maestro-seed-cli.ts check-delete-me
 */

import { createId } from "@paralleldrive/cuid2";
import {
  Color,
  Gender,
  ImageStatus,
  PlanType,
  Size,
  SwipeType,
} from "@prisma/client";

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

/**
 * The four dogs flows, pre-hooks and briefs refer to by name, with ids that
 * survive a reseed.
 *
 * They used to be cuid2s handed out at insert time, so every reseed moved
 * them and anything that wanted one — a `pegada://dog/<id>` deep link, a psql
 * one-liner in a brief, a hand-written screenshot script — had to resolve it
 * first. These are plain strings on purpose: `Dog.id` is a `String` with no
 * format constraint anywhere in the schema or the routes, and a readable id is
 * worth a lot when it shows up in a URL or a failing assertion.
 */
export const SEED_DOG_IDS = {
  /** The magic user's own dog. */
  rex: "seed-dog-rex",
  /** Matched with Rex, two messages. */
  bella: "seed-dog-bella",
  /** Matched with Rex, empty thread, four photos. */
  nina: "seed-dog-nina",
  /** Not matched, one photo, last card on Rex's deck. */
  mel: "seed-dog-mel",
} as const;

/** Pre-likes Rex so flow 22 can create a real match by swiping. */
const MATCHME_DOG_ID = "seed-dog-matchme";
const swipeDogId = (index: number) => `seed-dog-swipe-${index}`;

const yearsAgo = (n: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

/** The dog columns the seed owns. Anything a flow can change belongs here, so
 * the next run puts it back. */
type SeedDogFields = {
  name: string;
  gender: Gender;
  color: Color;
  size: Size;
  weight: number;
  birthDate: Date;
  bio: string;
  preferredMinAge?: number | null;
  preferredMaxAge?: number | null;
  preferredMaxDistance?: number | null;
  preferredSize?: Size | null;
};

type SeedDogSpec = {
  id: string;
  email: string;
  latitude?: number;
  longitude?: number;
  plan?: PlanType;
  /** Photo urls, in carousel order. */
  photos: string[];
  dog: SeedDogFields;
};

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

const photoId = (dogId: string, index: number) => `${dogId}-photo-${index + 1}`;

/**
 * Give a seed dog exactly the listed photos, in order.
 *
 * Keyed by dog and position rather than inserted, and everything else attached
 * to the dog is dropped: a flow that uploads a photo (24, 31) or a fixture
 * that pasted extra ones onto a seed dog used to survive into the next run,
 * which changes the pagination dots on every screen that renders her.
 */
const ensurePhotos = async (dogId: string, urls: string[]) => {
  const ids = urls.map((_, index) => photoId(dogId, index));

  for (const [index, url] of urls.entries()) {
    await prisma.image.upsert({
      where: { id: photoId(dogId, index) },
      update: { dogId, url, position: index, status: ImageStatus.APPROVED },
      create: {
        id: photoId(dogId, index),
        dogId,
        url,
        position: index,
        status: ImageStatus.APPROVED,
      },
    });
  }

  await prisma.image.deleteMany({ where: { dogId, id: { notIn: ids } } });
};

/**
 * Upsert one seed account and its single dog.
 *
 * The dog is keyed by a FIXED id, never by name and never by ownership. Both
 * of those lookups had the same failure mode from opposite ends: flow 24
 * renames Rex, so a name lookup created a SECOND dog for the account, and a
 * `deletedAt: null` filter treats a soft deleted dog as absent, so a profile a
 * flow deleted came back as a duplicate. Restoring the row under its own id is
 * what makes a re-run land on the same ids.
 */
const ensureSeedDog = async ({
  id,
  email,
  latitude,
  longitude,
  plan,
  photos,
  dog,
}: SeedDogSpec) => {
  const location = {
    city: "San Francisco",
    state: "CA",
    country: "USA",
    latitude: latitude ?? SF.lat,
    longitude: longitude ?? SF.lon,
    ...(plan ? { plan } : {}),
  };

  const user = await prisma.user.upsert({
    where: { email },
    update: { ...location, deletedAt: null },
    create: { email, ...location },
  });

  const seededDog = await prisma.dog.upsert({
    where: { id },
    update: {
      ...dog,
      userId: user.id,
      breedId: GOLDEN_ID,
      deletedAt: null,
      banned: false,
    },
    create: { id, ...dog, userId: user.id, breedId: GOLDEN_ID },
  });

  // One active dog per seed account. Runs from before the ids were fixed left
  // a duplicate behind; it is soft deleted rather than dropped because its
  // matches and messages still point at it.
  await prisma.dog.updateMany({
    where: { userId: user.id, deletedAt: null, id: { not: seededDog.id } },
    data: { deletedAt: new Date() },
  });

  await ensurePhotos(seededDog.id, photos);

  return { user, dog: seededDog };
};

/**
 * Write one side of a swipe.
 *
 * `Interest` is unique on (requesterId, responderId) and that constraint does
 * NOT include `deletedAt`, so "look it up filtered on deletedAt, insert if
 * missing" is a P2002 waiting for the first swipe: the app soft deletes the
 * row, the next seed run reads nothing, and the insert lands on the row that
 * is still there. Upserting on the constraint itself is the only lookup that
 * cannot miss.
 */
const upsertInterest = ({
  requesterId,
  responderId,
  swipeType,
  matchId,
}: {
  requesterId: string;
  responderId: string;
  swipeType: SwipeType;
  /** Left untouched when undefined, so a match a flow created mid-run keeps
   * its interest row. */
  matchId?: string | null;
}) =>
  prisma.interest.upsert({
    where: { requesterId_responderId: { requesterId, responderId } },
    update: {
      swipeType,
      deletedAt: null,
      ...(matchId === undefined ? {} : { matchId }),
    },
    create: { requesterId, responderId, swipeType, matchId: matchId ?? null },
  });

/**
 * A live match between two dogs, plus the mutual interest that keeps them off
 * each other's deck.
 *
 * The match is looked up WITHOUT a `deletedAt` filter and restored, not
 * re-created. Unmatching in the app soft deletes the row, and creating a
 * second one both duplicated the conversation in the Messages list and pushed
 * the interest insert into the unique violation above.
 */
const ensureMutualMatch = async (requesterId: string, responderId: string) => {
  const between = {
    OR: [
      { requesterId, responderId },
      { requesterId: responderId, responderId: requesterId },
    ],
  };

  const [oldest, ...duplicates] = await prisma.match.findMany({
    where: between,
    orderBy: { createdAt: "asc" },
  });

  const match = oldest
    ? await prisma.match.update({
        where: { id: oldest.id },
        data: { deletedAt: null },
      })
    : await prisma.match.create({ data: { requesterId, responderId } });

  if (duplicates.length > 0) {
    await prisma.match.updateMany({
      where: { id: { in: duplicates.map((duplicate) => duplicate.id) } },
      data: { deletedAt: new Date() },
    });
  }

  // `Interest.matchId` is unique and a swipe in the app writes it on whichever
  // side completed the match, which may be the opposite side from the one
  // seeded here. Releasing it first is what stops the upsert below from
  // colliding on the match it is about to claim.
  await prisma.interest.updateMany({
    where: { matchId: match.id },
    data: { matchId: null },
  });

  await upsertInterest({
    requesterId,
    responderId,
    swipeType: SwipeType.INTERESTED,
    matchId: match.id,
  });
  await upsertInterest({
    requesterId: responderId,
    responderId: requesterId,
    swipeType: SwipeType.INTERESTED,
    matchId: null,
  });

  return match;
};

// ---------------------------------------------------------------------------
// The seeded cast
// ---------------------------------------------------------------------------

const REX: SeedDogSpec = {
  id: SEED_DOG_IDS.rex,
  email: MAGIC_EMAIL,
  photos: ["https://placedog.net/640/480?id=1"],
  dog: {
    name: "Rex",
    gender: Gender.MALE,
    color: Color.GOLDEN,
    size: Size.LARGE,
    weight: 30,
    birthDate: yearsAgo(3),
    // `bio` and `preferredSize` are reset rather than only created because the
    // flows and the tour WRITE them — tour chunk 08 types into Bio and picks
    // size Medium, flow 24 edits both — and the pixel matrix compares the next
    // capture against a baseline taken before any of that. Leaving them out is
    // what produced the DATA rows in
    // .unistyles-migration/verify-r1/MATRIX-GATE.md: 05-profile off by one
    // line of bio, 06-preferences off by one row's value, and half of
    // 07-edit-profile. A field a test can change belongs in the reset.
    bio: REX_BIO,
    preferredSize: null,
    preferredMinAge: 1,
    preferredMaxAge: 15,
    preferredMaxDistance: 50,
  },
};

const BELLA: SeedDogSpec = {
  id: SEED_DOG_IDS.bella,
  email: "test+bella@pegada.app",
  photos: ["https://placedog.net/640/480?id=2"],
  dog: {
    name: "Bella",
    gender: Gender.FEMALE,
    color: Color.GOLDEN,
    size: Size.MEDIUM,
    weight: 20,
    birthDate: yearsAgo(2),
    bio: "Bella here — love long walks at the park.",
  },
};

/**
 * Nina: matched with Rex, empty thread, four photos.
 *
 * The empty thread is the slot flows 43 and 44 fill with 40 messages — growing
 * the Rex<->Bella one instead would change what flows 11, 12, 19 and 34 read.
 *
 * The four photos are the only carousel in the fixture. Every other seed dog
 * has one image, and with one image there is no paging, no pagination dots and
 * no boundary — which is why the card blacking out at the last photo (flow 45)
 * went unseen for as long as it did.
 */
const NINA: SeedDogSpec = {
  id: SEED_DOG_IDS.nina,
  email: "test+nina@pegada.app",
  photos: [
    "https://placedog.net/640/480?id=31",
    "https://placedog.net/640/480?id=32",
    "https://placedog.net/640/480?id=33",
    "https://placedog.net/640/480?id=34",
  ],
  dog: {
    name: "Nina",
    gender: Gender.FEMALE,
    color: Color.BLACK,
    size: Size.MEDIUM,
    weight: 22,
    birthDate: yearsAgo(4),
    bio: "Nina — four photos and a lot of opinions about tennis balls.",
  },
};

/**
 * Mel: on Rex's deck, never matched, never swiped.
 *
 * The one dog in the fixture that is reachable as a stranger's profile — a
 * share card, a `pegada://dog/<id>` deep link — under an id that does not move
 * between runs. She sits farther from Rex than MatchMe and the whole SwipeDog
 * pool so she is the LAST card, where no flow reaches her by accident.
 */
const MEL: SeedDogSpec = {
  id: SEED_DOG_IDS.mel,
  email: "test+mel@pegada.app",
  latitude: SF.lat + 0.1,
  photos: ["https://placedog.net/640/480?id=41"],
  dog: {
    name: "Mel",
    gender: Gender.FEMALE,
    color: Color.WHITE,
    size: Size.SMALL,
    weight: 8,
    birthDate: yearsAgo(1),
    bio: "Mel — new in town, still deciding which park is the good one.",
  },
};

const MATCHME: SeedDogSpec = {
  id: MATCHME_DOG_ID,
  email: MATCHME_EMAIL,
  // MatchMe's owner is marked PREMIUM so the SuggestionService priority column
  // evaluates to 1 (premium pre-liker), which forces MatchMe to the TOP of
  // Rex's swipe stack ahead of the SwipeDog pool below — both sets are
  // co-located in SF (~0km) so they otherwise tie on distance, and Postgres
  // makes no guarantee about tie ordering.
  plan: PlanType.PREMIUM,
  photos: ["https://placedog.net/640/480?id=22"],
  dog: {
    name: "MatchMe",
    gender: Gender.FEMALE,
    color: Color.GOLDEN,
    size: Size.MEDIUM,
    weight: 18,
    birthDate: yearsAgo(2),
    bio: "MatchMe — pre-liked Rex, ready to match in maestro flow #22.",
  },
};

/**
 * SwipeDogN: a small pool of nearby dogs that keep Rex's swipe deck populated
 * AFTER MatchMe gets consumed by flow #22 (or any like in flow #21). Without
 * these, the deck would be empty as soon as Rex swipes MatchMe — the 100
 * default-seed fake users live in Brazil (~9000km from SF) and are filtered
 * out by Rex's 50km preferredMaxDistance.
 *
 * These dogs deliberately have NO reciprocal Interest, so swiping INTERESTED
 * on them never creates a match — flow #21 can exercise like / dislike / maybe
 * / report on a fresh card every step without accidentally triggering the
 * new-match modal.
 */
const SWIPE_DOG_COUNT = 6;

const swipeDogSpec = (index: number): SeedDogSpec => ({
  id: swipeDogId(index),
  email: `test+swipedog${index}@pegada.app`,
  // Each SwipeDog sits STRICTLY farther from Rex than MatchMe (who is exactly
  // co-located at SF). The deck orders by `priority DESC, distance ASC`, and
  // priority=1 for pre-likers only applies to PREMIUM users — for a FREE user,
  // identical coordinates make the order a Postgres tie-break (arbitrary,
  // heap-dependent), and flow 22 flakes whenever MatchMe isn't first. ~1.1km
  // per index keeps a stable SwipeDog1..6 order and everyone inside the 50km
  // preference, with room left over for Mel behind them.
  latitude: SF.lat + 0.01 * index,
  photos: [`https://placedog.net/640/480?id=${100 + index}`],
  dog: {
    name: `SwipeDog${index}`,
    // All FEMALE — Rex is MALE and the SuggestionService preference filter
    // shows ONLY opposite-gender dogs. Mixing in MALEs would make half the
    // pool invisible to Rex's stack.
    gender: Gender.FEMALE,
    color: Color.GOLDEN,
    size: Size.MEDIUM,
    weight: 15 + index,
    birthDate: yearsAgo(2 + (index % 4)),
    bio: `SwipeDog${index} — nearby SF dog seeded to keep Rex's swipe stack populated.`,
  },
});

// ---------------------------------------------------------------------------
// Rex / Bella / Nina / Mel / MatchMe seed (non-destructive flows)
// ---------------------------------------------------------------------------

/** The two-message Rex<->Bella thread flows 11, 12, 19 and 34 read. */
const ensureBellaConversation = async ({
  matchId,
  rexId,
  bellaId,
}: {
  matchId: string;
  rexId: string;
  bellaId: string;
}) => {
  const existing = await prisma.message.count({
    where: { matchId, deletedAt: null },
  });
  // Left alone when it is already there: flow 34 back-dates these two, and
  // rewriting them every run would undo the fixture it is asserting on.
  if (existing >= 2) return existing;

  const now = Date.now();
  await prisma.message.deleteMany({ where: { matchId } });
  await prisma.message.createMany({
    data: [
      {
        content: "Hey Bella! Want to meet up at the dog park?",
        senderId: rexId,
        receiverId: bellaId,
        matchId,
        createdAt: new Date(now - 1000 * 60 * 30),
      },
      {
        content: "Hi Rex! Yes, that sounds great. How about 3pm?",
        senderId: bellaId,
        receiverId: rexId,
        matchId,
        createdAt: new Date(now - 1000 * 60 * 5),
      },
    ],
  });

  return 2;
};

/**
 * The one-sided like MatchMe → Rex. When Rex swipes INTERESTED on MatchMe,
 * SwipeService.checkForMutualInterest finds THIS row and creates the real
 * match — the API responds with `{ match }`, the swipe saga pushes /new-match
 * and the NewMatch modal opens.
 *
 * Additive only. The teardown that used to live here — deleting every Match,
 * Message and Interest between Rex and MatchMe — moved to
 * `resetMatchMePreLike` below, because it ran on EVERY flow's pre-test hook
 * and the dev Postgres is shared. Mid-capture, a concurrent flow's seed
 * hard-deleted the match a tour had just created: `message.send` started
 * answering 500 `Invalid matchId or senderId`, the chat rendered empty,
 * MatchMe disappeared from the Messages list and edit-profile values reverted
 * between chunks. It reads exactly like a chat regression and cost an hour to
 * attribute (.unistyles-migration/tour-android/MANIFEST.md, "Environment
 * trap").
 *
 * So `matchId` is deliberately left out of the upsert: a match flow 22 created
 * seconds ago keeps its interest row intact.
 */
const ensureMatchMePreLike = (matchMeId: string, rexId: string) =>
  upsertInterest({
    requesterId: matchMeId,
    responderId: rexId,
    swipeType: SwipeType.INTERESTED,
  });

/** Keep a dog swipeable by Rex: no interest in either direction. */
const clearInterestsBetween = async (dogId: string, rexId: string) => {
  await prisma.interest.deleteMany({
    where: {
      OR: [
        { requesterId: dogId, responderId: rexId },
        { requesterId: rexId, responderId: dogId },
      ],
    },
  });
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
  const rex = await prisma.dog.findUnique({
    where: { id: SEED_DOG_IDS.rex },
  });

  const matchMe = await prisma.dog.findUnique({
    where: { id: MATCHME_DOG_ID },
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
      swipeType: SwipeType.INTERESTED,
    },
  });

  return { rex, matchMe, preLike };
};

export const seedMaestroFixtures = async () => {
  await ensureBreed();

  const { user: magicUser, dog: rex } = await ensureSeedDog(REX);
  const { dog: bella } = await ensureSeedDog(BELLA);
  const { dog: nina } = await ensureSeedDog(NINA);
  const { dog: mel } = await ensureSeedDog(MEL);
  const { dog: matchMe } = await ensureSeedDog(MATCHME);

  const bellaMatch = await ensureMutualMatch(rex.id, bella.id);
  const messageCount = await ensureBellaConversation({
    matchId: bellaMatch.id,
    rexId: rex.id,
    bellaId: bella.id,
  });

  // Nina's thread stays empty on purpose. Flows 43 and 44 fill it.
  const ninaMatch = await ensureMutualMatch(rex.id, nina.id);

  await clearInterestsBetween(mel.id, rex.id);
  const preLike = await ensureMatchMePreLike(matchMe.id, rex.id);

  const swipePool = [];
  for (let index = 1; index <= SWIPE_DOG_COUNT; index++) {
    const { dog } = await ensureSeedDog(swipeDogSpec(index));
    // Defensive: a reciprocal Interest left by a previous run would flip one of
    // these into a match. Keeps swiping INTERESTED on them inert (no new-match
    // modal).
    await clearInterestsBetween(dog.id, rex.id);
    swipePool.push({ name: dog.name, id: dog.id });
  }

  return {
    magicUser: { id: magicUser.id, email: magicUser.email },
    rex: { id: rex.id, name: rex.name },
    bella: { id: bella.id, name: bella.name },
    bellaMatch: { id: bellaMatch.id },
    nina: { id: nina.id, name: nina.name },
    ninaMatch: { id: ninaMatch.id },
    mel: { id: mel.id, name: mel.name },
    matchMe: { id: matchMe.id, name: matchMe.name },
    matchMePreLike: { id: preLike.id, swipeType: preLike.swipeType },
    swipePool,
    messageCount,
  };
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
