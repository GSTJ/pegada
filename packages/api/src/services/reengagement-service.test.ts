import prisma from "@pegada/database";
import { breedData } from "@pegada/database/fixtures/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";

import { cadenceDecision, readCadence } from "./reengagement-cadence";
import {
  isWithinSendWindow,
  localHourFromLongitude,
  MAX_CANDIDATES_PER_QUERY,
  REENGAGEMENT_KINDS,
  ReengagementService,
  selectLikesWaitingCandidates,
  selectNewDogsNearbyCandidates,
  selectUnansweredMatchCandidates,
} from "./reengagement-service";

jest.mock("../shared/observability", () => ({
  observability: {
    enabled: false,
    disabledReason: "explicitly-disabled",
    capture: jest.fn(),
    captureError: jest.fn(),
    identify: jest.fn(),
    reset: jest.fn(),
    register: jest.fn(),
    flush: jest.fn(),
    shutdown: jest.fn(),
  },
  getPostHogNode: jest.fn(() => null),
}));

jest.mock("./push-notification-service", () => ({
  PushNotificationService: { enqueuePushNotification: jest.fn() },
}));

const { PushNotificationService } = jest.requireMock(
  "./push-notification-service",
) as { PushNotificationService: { enqueuePushNotification: jest.Mock } };

const { observability } = jest.requireMock("../shared/observability") as {
  observability: { capture: jest.Mock };
};

const PUSH_TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";

/** Salvador, Bahia. Longitude -38.5 puts the fixtures three hours behind UTC. */
const LONGITUDE = -38.5;
const LATITUDE = -12.97;

/** 18:00 in UTC-3, the first of the two hours a nudge may leave in. */
const NOW = new Date("2026-09-01T21:00:00.000Z");

/** 03:00 in UTC-3, the middle of the night. */
const NIGHT = new Date("2026-09-01T06:00:00.000Z");

/**
 * The instant of the production incident: 19:03 UTC, which is 16:03 in
 * Sao Paulo. Inside the old "not quiet hours" window, outside the evening one.
 */
const AFTERNOON_BURST = new Date("2026-09-02T19:03:00.000Z");

const hoursBefore = (reference: Date, hours: number) =>
  new Date(reference.getTime() - hours * 60 * 60 * 1000);

const hoursAgo = (hours: number) => hoursBefore(NOW, hours);

const daysAgo = (days: number) => hoursAgo(days * 24);

const reachableUser = (overrides: Record<string, unknown> = {}) => ({
  pushToken: PUSH_TOKEN,
  latitude: LATITUDE,
  longitude: LONGITUDE,
  ...overrides,
});

/**
 * Older than the 30 day floor the new-dogs count falls back to, so a fixture
 * dog is only ever "new" when a test says so.
 */
const DEFAULT_DOG_AGE_DAYS = 60;

/**
 * A fixture user and dog stamped against {@link NOW}.
 *
 * Every row this service reads sits on one side of a time comparison whose
 * other side comes from the injected clock, so a row left on the column's
 * `DEFAULT now()` puts the machine clock into the middle of a pinned window
 * and the suite starts passing or failing on the day it is run. `Dog.createdAt`
 * is the one that matters here: it is what the new-dogs count is measured
 * against, and on the real clock the fixture dogs of a likes-waiting test were
 * silently new enough to queue a second kind behind the one under test.
 */
const seedUserWithDog = async (
  dogData?: Parameters<typeof generateFakeUserWithDog>[0],
  userData?: Parameters<typeof generateFakeUserWithDog>[1],
  createdAt: Date = daysAgo(DEFAULT_DOG_AGE_DAYS),
) => {
  const created = await generateFakeUserWithDog(dogData, userData);

  await prisma.dog.update({
    where: { id: created.dog.id },
    data: { createdAt },
  });

  return created;
};

/** A like, with both of its timestamps pinned rather than half of them. */
const seedInterest = async (
  data: {
    requesterId: string;
    responderId: string;
    swipeType: "INTERESTED" | "MAYBE" | "NOT_INTERESTED";
    lastPositiveAt?: Date;
  },
  createdAt: Date,
) => {
  const interest = await prisma.interest.create({ data });

  return prisma.interest.update({
    where: { id: interest.id },
    data: { createdAt },
  });
};

afterAll(async () => {
  await prisma.$disconnect();
});

beforeAll(async () => {
  await prisma.breed.deleteMany();
  await prisma.breed.createMany({ data: breedData });
});

beforeEach(async () => {
  // One statement rather than a chain of `deleteMany`s: `relationMode =
  // "prisma"` makes Prisma police the relations itself, and these fixtures
  // wire Interest to both Dog and Match, so there is no delete order that does
  // not trip over one of them.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "NotificationLog", "Message", "Interest", "Match", "Image", "Dog", "User" CASCADE',
  );
});

/** Two dogs that matched `hours` before `reference` and never spoke. */
const seedSilentMatch = async (hours: number, reference = NOW) => {
  const [{ dog: requester }, { dog: responder }] = await Promise.all([
    seedUserWithDog({ gender: "MALE" }, reachableUser()),
    seedUserWithDog({ gender: "FEMALE" }, reachableUser()),
  ]);

  const match = await prisma.match.create({
    data: { requesterId: requester.id, responderId: responder.id },
  });

  await prisma.match.update({
    where: { id: match.id },
    data: { createdAt: hoursBefore(reference, hours) },
  });

  return { match, requester, responder };
};

describe("localHourFromLongitude", () => {
  it("reads the hour from the longitude offset", () => {
    expect(localHourFromLongitude(LONGITUDE, NOW)).toBe(18);
    expect(localHourFromLongitude(0, NOW)).toBe(21);
    expect(localHourFromLongitude(150, NOW)).toBe(7);
  });

  it("has no hour without a longitude", () => {
    expect(localHourFromLongitude(null, NOW)).toBeNull();
    expect(localHourFromLongitude(undefined, NOW)).toBeNull();
  });
});

describe("isWithinSendWindow", () => {
  it("opens for the two evening hours and nothing else", () => {
    // 18:00 and 19:00 local.
    expect(isWithinSendWindow(LONGITUDE, NOW)).toBe(true);
    expect(
      isWithinSendWindow(LONGITUDE, new Date("2026-09-01T22:00:00.000Z")),
    ).toBe(true);
    // 17:00 local, an hour early.
    expect(
      isWithinSendWindow(LONGITUDE, new Date("2026-09-01T20:00:00.000Z")),
    ).toBe(false);
    // 20:00 local, an hour late.
    expect(
      isWithinSendWindow(LONGITUDE, new Date("2026-09-01T23:00:00.000Z")),
    ).toBe(false);
    // 03:00 local.
    expect(isWithinSendWindow(LONGITUDE, NIGHT)).toBe(false);
  });

  it("holds a located user to the same window as everybody else", () => {
    // The production incident. Sao Paulo, 16:03 local: the old rule let any
    // located user through from 09:00 to 21:00, so this went out.
    expect(isWithinSendWindow(-46.63, AFTERNOON_BURST)).toBe(false);
    expect(isWithinSendWindow(null, AFTERNOON_BURST)).toBe(false);

    // Three hours later, in the slot, both are due.
    const evening = new Date("2026-09-02T22:00:00.000Z");

    expect(isWithinSendWindow(-46.63, evening)).toBe(true);
    expect(isWithinSendWindow(null, evening)).toBe(true);
  });

  it("uses America/Sao_Paulo when there are no coordinates", () => {
    // 18:00 in UTC-3, and 19:00 so one missed cron run does not drop the
    // whole cohort for the day.
    expect(isWithinSendWindow(null, NOW)).toBe(true);
    expect(isWithinSendWindow(null, new Date("2026-09-01T22:00:00.000Z"))).toBe(
      true,
    );
    // 20:00 in UTC-3, past the slot.
    expect(isWithinSendWindow(null, new Date("2026-09-01T23:00:00.000Z"))).toBe(
      false,
    );
  });
});

describe("selectUnansweredMatchCandidates", () => {
  it("nudges both sides of a match that went silent", async () => {
    const { match, requester, responder } = await seedSilentMatch(25);

    const candidates = await selectUnansweredMatchCandidates(NOW);

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.kind)).toEqual([
      REENGAGEMENT_KINDS.UNANSWERED_MATCH,
      REENGAGEMENT_KINDS.UNANSWERED_MATCH,
    ]);
    expect(candidates.map((candidate) => candidate.url).sort()).toEqual(
      [
        `chat/${match.id}/${requester.id}`,
        `chat/${match.id}/${responder.id}`,
      ].sort(),
    );
    expect(
      candidates.every((candidate) => candidate.dedupeKey.endsWith(":24h")),
    ).toBe(true);
  });

  it("skips a match that is not old enough yet", async () => {
    await seedSilentMatch(3);

    await expect(selectUnansweredMatchCandidates(NOW)).resolves.toEqual([]);
  });

  it("skips a match somebody already spoke on", async () => {
    const { match, requester, responder } = await seedSilentMatch(25);

    await prisma.message.create({
      data: {
        content: "oi",
        senderId: requester.id,
        receiverId: responder.id,
        matchId: match.id,
      },
    });

    await expect(selectUnansweredMatchCandidates(NOW)).resolves.toEqual([]);
  });

  it("adds the 72 hour nudge once the match is older", async () => {
    await seedSilentMatch(80);

    const candidates = await selectUnansweredMatchCandidates(NOW);

    expect(candidates).toHaveLength(2);
    expect(
      candidates.every((candidate) => candidate.dedupeKey.endsWith(":72h")),
    ).toBe(true);
  });

  it("leaves alone the side that has been in the app today", async () => {
    const { requester } = await seedSilentMatch(25);

    // The proxy still says "went silent": nobody has spoken on the match. The
    // column says this one never left, so only the other side is worth a push.
    await prisma.user.update({
      where: { id: requester.userId },
      data: { lastActiveAt: hoursAgo(2) },
    });

    const candidates = await selectUnansweredMatchCandidates(NOW);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.userId).not.toBe(requester.userId);
  });

  it("skips a user with no push token", async () => {
    const { match } = await seedSilentMatch(25);
    const silent = await prisma.match.findUniqueOrThrow({
      where: { id: match.id },
      select: { requester: { select: { userId: true } } },
    });

    await prisma.user.update({
      where: { id: silent.requester.userId },
      data: { pushToken: null },
    });

    await expect(selectUnansweredMatchCandidates(NOW)).resolves.toHaveLength(1);
  });

  /**
   * `count` silent matches between users whose token has already been pruned,
   * seeded in bulk because the point of the test below is the row count.
   */
  const seedPrunedMatches = async (count: number, createdAt: Date) => {
    const dogs = Array.from({ length: count * 2 }, (_, index) => ({
      id: `pruned-dog-${index}`,
      name: `pruned-${index}`,
      gender: index % 2 === 0 ? ("MALE" as const) : ("FEMALE" as const),
      userId: `pruned-user-${index}`,
    }));

    await prisma.user.createMany({
      data: dogs.map((dog, index) => ({
        id: dog.userId,
        email: `pruned-${index}@test.example`,
        // What `UserService.blacklistPushToken` writes once Expo has answered
        // `DeviceNotRegistered`.
        pushToken: "",
        latitude: LATITUDE,
        longitude: LONGITUDE,
      })),
    });

    await prisma.dog.createMany({ data: dogs });

    await prisma.match.createMany({
      data: Array.from({ length: count }, (_, index) => ({
        id: `pruned-match-${index}`,
        requesterId: `pruned-dog-${index * 2}`,
        responderId: `pruned-dog-${index * 2 + 1}`,
        createdAt,
      })),
    });
  };

  /**
   * The reachability rule has to be in the query, not after it.
   *
   * `take` is applied by Postgres, so a filter that runs in JS on the rows
   * that came back cannot rescue somebody who never came back: dead installs
   * sorted ahead of a live one take every slot and the live one is simply not
   * in the result to be filtered. A full ceiling of pruned matches, all newer
   * than the one reachable match, is the only shape that tells the two apart.
   */
  it("keeps a reachable match when pruned tokens would fill the whole run", async () => {
    const { match, requester, responder } = await seedSilentMatch(71);

    await seedPrunedMatches(MAX_CANDIDATES_PER_QUERY, hoursAgo(25));

    const candidates = await selectUnansweredMatchCandidates(NOW);

    expect(candidates.map(({ userId }) => userId).sort()).toEqual(
      [requester.userId, responder.userId].sort(),
    );
    expect(candidates.map(({ url }) => url).sort()).toEqual(
      [
        `chat/${match.id}/${requester.id}`,
        `chat/${match.id}/${responder.id}`,
      ].sort(),
    );
  });
});

describe("selectNewDogsNearbyCandidates", () => {
  /** An inactive owner plus `count` dogs created since they stopped swiping. */
  const seedInactiveOwnerWithNewDogs = async (count: number) => {
    const { user, dog } = await seedUserWithDog(
      { gender: "MALE" },
      reachableUser(),
    );

    // Somebody they already swiped on, four days ago.
    const { dog: swiped } = await seedUserWithDog(
      { gender: "FEMALE" },
      reachableUser({ pushToken: null }),
    );

    await seedInterest(
      {
        requesterId: dog.id,
        responderId: swiped.id,
        swipeType: "INTERESTED",
        lastPositiveAt: daysAgo(4),
      },
      daysAgo(4),
    );

    for (const index of Array.from({ length: count }, (_value, i) => i)) {
      // oxlint-disable-next-line no-await-in-loop -- Fixture rows are created in order so their timestamps stay distinct.
      await seedUserWithDog(
        { gender: "FEMALE", name: `New ${index}` },
        reachableUser({ pushToken: null }),
        daysAgo(1),
      );
    }

    return { user, dog };
  };

  it("selects an inactive owner once enough new dogs arrived", async () => {
    const { user } = await seedInactiveOwnerWithNewDogs(3);

    const candidates = await selectNewDogsNearbyCandidates(NOW);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: REENGAGEMENT_KINDS.NEW_DOGS_NEARBY,
      userId: user.id,
      url: "swipe",
    });
    expect(candidates[0]?.dedupeKey).toContain(`:${user.id}:3d:`);
  });

  it("stays quiet when fewer than three new dogs arrived", async () => {
    await seedInactiveOwnerWithNewDogs(2);

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);
  });

  it("ignores new dogs outside the preferred distance", async () => {
    const { dog } = await seedInactiveOwnerWithNewDogs(3);

    await prisma.dog.update({
      where: { id: dog.id },
      data: { preferredMaxDistance: 1 },
    });

    await prisma.user.updateMany({
      where: { pushToken: null },
      data: { latitude: -23.55, longitude: -46.63 },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);
  });

  it("reads a zero preferred distance as no preference, like the deck does", async () => {
    const { dog } = await seedInactiveOwnerWithNewDogs(3);

    await prisma.dog.update({
      where: { id: dog.id },
      data: { preferredMaxDistance: 0 },
    });

    await prisma.user.updateMany({
      where: { pushToken: null },
      data: { latitude: -23.55, longitude: -46.63 },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toHaveLength(1);
  });

  it("lets a user who never swiped be nudged again in the next period", async () => {
    const { user } = await seedInactiveOwnerWithNewDogs(3);

    // No positive swipe at all, so there is no anchor to rate limit them.
    await prisma.interest.deleteMany({
      where: { requester: { userId: user.id } },
    });

    const [candidate] = await selectNewDogsNearbyCandidates(NOW);

    expect(candidate?.dedupeKey).toMatch(/:never:\d+$/);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        kind: REENGAGEMENT_KINDS.NEW_DOGS_NEARBY,
        dedupeKey: candidate?.dedupeKey ?? "",
        sentAt: hoursAgo(1),
      },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);

    // A period later the key names a new period and the filter lets them back.
    const nextPeriod = new Date(NOW.getTime() + 31 * 24 * 60 * 60 * 1000);

    await prisma.dog.updateMany({
      where: { userId: { not: user.id } },
      data: { createdAt: hoursBefore(nextPeriod, 24) },
    });

    const later = await selectNewDogsNearbyCandidates(nextPeriod);

    expect(later).toHaveLength(1);
    expect(later[0]?.dedupeKey).not.toBe(candidate?.dedupeKey);
  });

  it("selects a user who asked to be told even though they are active", async () => {
    const { user } = await seedInactiveOwnerWithNewDogs(3);

    await prisma.interest.updateMany({
      where: { requester: { userId: user.id } },
      data: { lastPositiveAt: hoursAgo(1) },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);

    await prisma.user.update({
      where: { id: user.id },
      data: { newDogsAlertRequestedAt: daysAgo(2) },
    });

    const candidates = await selectNewDogsNearbyCandidates(NOW);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.dedupeKey).toContain(":requested:");
    expect(candidates[0]?.clearsNewDogsAlert).toBe(true);
  });

  it("leaves alone an owner who opened the app in the last day", async () => {
    const { user } = await seedInactiveOwnerWithNewDogs(3);

    // Still no positive swipe for four days, so the proxy would nudge them.
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: hoursAgo(2) },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);

    // Older than the window, so the proxy decides again.
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: daysAgo(2) },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toHaveLength(1);
  });

  it("drops a user whose token was blacklisted", async () => {
    const { user } = await seedInactiveOwnerWithNewDogs(3);

    // `blacklistPushToken` writes an empty string rather than null.
    await prisma.user.update({
      where: { id: user.id },
      data: { pushToken: "" },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);
  });

  it("does not select a user who was already told about this anchor", async () => {
    const { user } = await seedInactiveOwnerWithNewDogs(3);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        kind: REENGAGEMENT_KINDS.NEW_DOGS_NEARBY,
        dedupeKey: "already-told",
        sentAt: hoursAgo(2),
      },
    });

    await expect(selectNewDogsNearbyCandidates(NOW)).resolves.toEqual([]);
  });
});

describe("selectLikesWaitingCandidates", () => {
  const seedWaitingLike = async (hours: number) => {
    const [{ user, dog: liked }, { dog: admirer }] = await Promise.all([
      seedUserWithDog({ gender: "FEMALE" }, reachableUser()),
      seedUserWithDog({ gender: "MALE" }, reachableUser({ pushToken: null })),
    ]);

    const interest = await seedInterest(
      {
        requesterId: admirer.id,
        responderId: liked.id,
        swipeType: "INTERESTED",
        lastPositiveAt: hoursAgo(hours),
      },
      hoursAgo(hours),
    );

    return { user, liked, admirer, interest };
  };

  it("selects an owner sitting on a like older than a day", async () => {
    const { user, interest } = await seedWaitingLike(30);

    const candidates = await selectLikesWaitingCandidates(NOW);

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: REENGAGEMENT_KINDS.LIKES_WAITING,
      userId: user.id,
      url: "swipe",
      dedupeKey: `${REENGAGEMENT_KINDS.LIKES_WAITING}:${user.id}:${interest.id}`,
    });
  });

  it("skips a like that is still fresh", async () => {
    await seedWaitingLike(2);

    await expect(selectLikesWaitingCandidates(NOW)).resolves.toEqual([]);
  });

  it("skips a like the owner already answered", async () => {
    const { liked, admirer } = await seedWaitingLike(30);

    await seedInterest(
      {
        requesterId: liked.id,
        responderId: admirer.id,
        swipeType: "NOT_INTERESTED",
      },
      hoursAgo(1),
    );

    await expect(selectLikesWaitingCandidates(NOW)).resolves.toEqual([]);
  });

  it("skips a like from a dog the deck would no longer show", async () => {
    const { admirer } = await seedWaitingLike(30);

    await prisma.dog.update({
      where: { id: admirer.id },
      data: { banned: true },
    });

    await expect(selectLikesWaitingCandidates(NOW)).resolves.toEqual([]);
  });

  it("stays quiet for a week after the last one, even for a brand new like", async () => {
    const { user } = await seedWaitingLike(30);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        kind: REENGAGEMENT_KINDS.LIKES_WAITING,
        dedupeKey: "announced-three-days-ago",
        sentAt: daysAgo(3),
      },
    });

    await expect(selectLikesWaitingCandidates(NOW)).resolves.toEqual([]);

    // Eight days on, the floor has passed and the like is fair game again.
    await prisma.notificationLog.updateMany({ data: { sentAt: daysAgo(8) } });

    await expect(selectLikesWaitingCandidates(NOW)).resolves.toHaveLength(1);
  });

  it("does not repeat itself once the oldest waiting like was announced", async () => {
    const { user, interest } = await seedWaitingLike(30);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        kind: REENGAGEMENT_KINDS.LIKES_WAITING,
        dedupeKey: `${REENGAGEMENT_KINDS.LIKES_WAITING}:${user.id}:${interest.id}`,
        sentAt: hoursAgo(2),
      },
    });

    await expect(selectLikesWaitingCandidates(NOW)).resolves.toEqual([]);
  });
});

describe("ReengagementService.run", () => {
  it("sends each nudge once and never twice in the same day", async () => {
    await seedSilentMatch(25);

    const first = await ReengagementService.run(NOW);

    expect(first.sent).toBe(2);
    expect(first.byKind[REENGAGEMENT_KINDS.UNANSWERED_MATCH]).toBe(2);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).toHaveBeenCalledTimes(2);
    expect(
      PushNotificationService.enqueuePushNotification.mock.calls[0]?.[0].data,
    ).toMatchObject({ kind: REENGAGEMENT_KINDS.UNANSWERED_MATCH });

    // The send half of the open rate. `dedupe_key` is what pairs it with the
    // "Push Notification Opened" the tap produces.
    expect(observability.capture).toHaveBeenCalledWith(
      "Reengagement Push Sent",
      expect.objectContaining({
        kind: REENGAGEMENT_KINDS.UNANSWERED_MATCH,
        dedupe_key: expect.stringContaining(
          REENGAGEMENT_KINDS.UNANSWERED_MATCH,
        ),
      }),
    );

    const second = await ReengagementService.run(NOW);

    expect(second.sent).toBe(0);
    expect(second.skippedAlreadySent).toBe(2);
    expect(await prisma.notificationLog.count()).toBe(2);
  });

  it("holds a user to one push whatever else they qualify for", async () => {
    const { responder } = await seedSilentMatch(25);

    expect((await ReengagementService.run(NOW)).sent).toBe(2);

    // A second silent match for the same person, so an hour later there is a
    // candidate whose key has never been claimed. The cadence is the only
    // thing left that can stop it.
    const { dog: other } = await seedUserWithDog(
      { gender: "MALE" },
      reachableUser({ pushToken: null }),
    );
    const second = await prisma.match.create({
      data: { requesterId: other.id, responderId: responder.id },
    });
    await prisma.match.update({
      where: { id: second.id },
      data: { createdAt: hoursAgo(25) },
    });

    const summary = await ReengagementService.run(
      new Date(NOW.getTime() + 60 * 60 * 1000),
    );

    expect(summary.sent).toBe(0);
    expect(summary.suppressed.cooldown).toBe(1);
    // The two from the first run and nothing since.
    expect(
      PushNotificationService.enqueuePushNotification,
    ).toHaveBeenCalledTimes(2);
  });

  it("falls through to the next kind once the schedule comes round", async () => {
    const { responder } = await seedSilentMatch(25);

    const { dog: admirer } = await seedUserWithDog(
      { gender: "MALE" },
      reachableUser({ pushToken: null }),
    );
    await seedInterest(
      {
        requesterId: admirer.id,
        responderId: responder.id,
        swipeType: "INTERESTED",
        lastPositiveAt: hoursAgo(30),
      },
      hoursAgo(30),
    );

    await ReengagementService.run(NOW);

    // Age the log past the first unanswered gap. The match nudge is still
    // claimed, so a user whose best candidate is spent has to reach their next
    // one rather than lose the slot to it.
    await prisma.notificationLog.updateMany({ data: { sentAt: daysAgo(11) } });

    const summary = await ReengagementService.run(NOW);

    expect(summary.sent).toBe(1);
    expect(summary.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(1);
  });

  it("does not send in the afternoon the production burst went out in", async () => {
    await seedSilentMatch(25, AFTERNOON_BURST);

    // Sao Paulo. The old rule let a located user through at any hour from
    // 09:00 to 21:00 local, which is how 200 pushes left at 16:03.
    await prisma.user.updateMany({
      data: { latitude: -23.55, longitude: -46.63 },
    });

    const burst = await ReengagementService.run(AFTERNOON_BURST);

    expect(burst.sent).toBe(0);
    expect(burst.suppressed.window).toBe(2);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).not.toHaveBeenCalled();

    // The same two candidates three hours later, now 19:00 local.
    const evening = await ReengagementService.run(
      new Date("2026-09-02T22:00:00.000Z"),
    );

    expect(evening.sent).toBe(2);
  });

  it("nudges about waiting likes on the schedule, not once a day", async () => {
    const { user, dog: liked } = await seedUserWithDog(
      { gender: "FEMALE" },
      reachableUser(),
    );

    /** Eleven admirers, oldest like first, all of them waiting over a day. */
    const likes: { id: string }[] = [];
    for (const index of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      // oxlint-disable-next-line no-await-in-loop -- Fixture rows are created in order so their timestamps stay distinct.
      const { dog: admirer } = await seedUserWithDog(
        { gender: "MALE", name: `Admirer ${index}` },
        reachableUser({ pushToken: null }),
      );

      // oxlint-disable-next-line no-await-in-loop -- Same.
      const like = await seedInterest(
        {
          requesterId: admirer.id,
          responderId: liked.id,
          swipeType: "INTERESTED",
          lastPositiveAt: hoursAgo(60 - index),
        },
        hoursAgo(60 - index),
      );

      likes.push(like);
    }

    const first = await ReengagementService.run(NOW);

    expect(first.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(1);

    /**
     * The next evening slot, with the like that was announced taken off the
     * board. A swipe back does exactly this, and it is what moves the anchor
     * the dedupe key is built from: every one of these days offers a key that
     * has never been claimed, so the cadence is the only thing left holding
     * the nudge back.
     */
    const runOnDay = async (day: number) => {
      await prisma.interest.update({
        where: { id: likes[day - 1]?.id },
        data: { deletedAt: NOW },
      });

      return ReengagementService.run(
        new Date(NOW.getTime() + day * 24 * 60 * 60 * 1000),
      );
    };

    for (const day of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      // oxlint-disable-next-line no-await-in-loop -- Each day has to see the log the previous day wrote.
      const summary = await runOnDay(day);

      expect(summary.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(0);
    }

    await expect(
      prisma.notificationLog.count({
        where: { userId: user.id, kind: REENGAGEMENT_KINDS.LIKES_WAITING },
      }),
    ).resolves.toBe(1);

    // Ten days on, the gap owed after one unanswered push has passed and the
    // likes still sitting there are worth one more nudge.
    const later = await runOnDay(10);

    expect(later.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(1);
  });

  it("sends nothing outside the evening window", async () => {
    await seedSilentMatch(25, NIGHT);

    const summary = await ReengagementService.run(NIGHT);

    expect(summary.sent).toBe(0);
    expect(summary.suppressed.window).toBe(2);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).not.toHaveBeenCalled();

    // The same two candidates, unchanged, at that day's 18:00 local slot. The
    // pair is the point: it is the hour deciding, not anything else about the
    // fixture, and the night run left nothing behind that blocks the evening.
    const evening = await ReengagementService.run(NOW);

    expect(evening.sent).toBe(2);
    expect(evening.suppressed.window).toBe(0);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).toHaveBeenCalledTimes(2);
  });

  it("stamps the log with the run's instant, not the machine clock", async () => {
    await seedSilentMatch(25);

    await ReengagementService.run(NOW);

    // The whole service measures its caps against the instant it was handed,
    // so the rows it writes have to be on that clock too. When they were left
    // on the column's `DEFAULT now()`, the weekly likes-waiting floor was read
    // against a row from a different day and this suite's result depended on
    // the date it ran on.
    const logs = await prisma.notificationLog.findMany({
      select: { sentAt: true },
    });

    expect(logs).toHaveLength(2);
    expect(logs.map(({ sentAt }) => sentAt.toISOString())).toEqual([
      NOW.toISOString(),
      NOW.toISOString(),
    ]);
  });

  it("clears the alert request after answering it", async () => {
    const { user, dog } = await seedUserWithDog(
      { gender: "MALE" },
      reachableUser({ newDogsAlertRequestedAt: daysAgo(2) }),
    );

    // Newer than the moment the alert was asked for, which is the anchor the
    // count is measured from.
    for (const index of [0, 1, 2]) {
      // oxlint-disable-next-line no-await-in-loop -- Fixture rows are created in order so their timestamps stay distinct.
      await seedUserWithDog(
        { gender: "FEMALE", name: `New ${index}` },
        reachableUser({ pushToken: null }),
        daysAgo(1),
      );
    }

    expect(dog.userId).toBe(user.id);

    const summary = await ReengagementService.run(NOW);

    expect(summary.sent).toBe(1);
    expect(summary.byKind[REENGAGEMENT_KINDS.NEW_DOGS_NEARBY]).toBe(1);
    await expect(
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { newDogsAlertRequestedAt: true },
      }),
    ).resolves.toEqual({ newDogsAlertRequestedAt: null });

    // Clearing the request moves the anchor back to the last positive swipe,
    // which is what used to re-qualify the user under the inactivity rule the
    // moment the daily cap expired.
    const tomorrow = new Date(NOW.getTime() + 25 * 60 * 60 * 1000);
    const nextDay = await ReengagementService.run(tomorrow);

    expect(nextDay.sent).toBe(0);
  });

  it("does not count a push to a token Expo will reject", async () => {
    await seedSilentMatch(25);
    await prisma.user.updateMany({ data: { pushToken: "not-a-real-token" } });

    const summary = await ReengagementService.run(NOW);

    expect(summary.sent).toBe(0);
    expect(summary.skippedUnreachable).toBe(2);
    expect(await prisma.notificationLog.count()).toBe(0);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).not.toHaveBeenCalled();
  });
});

describe("reengagement cadence", () => {
  /**
   * The cadence reads two things: the log rows and `lastActiveAt`. Seeding
   * both directly is what lets one test span six months without inventing six
   * months of matches, and it is the same pair the service reads in
   * production.
   */
  const seedDormantUser = async (lastActiveAt: Date | null) => {
    const { user } = await seedUserWithDog(
      { gender: "MALE" },
      reachableUser({ lastActiveAt }),
    );

    return user;
  };

  let sequence = 0;

  const seedPush = (
    userId: string,
    sentAt: Date,
    overrides: { receiptError?: string; ticketError?: string } = {},
  ) => {
    sequence += 1;

    return prisma.notificationLog.create({
      data: {
        userId,
        kind: REENGAGEMENT_KINDS.NEW_DOGS_NEARBY,
        dedupeKey: `seeded:${sequence}`,
        sentAt,
        ...overrides,
      },
    });
  };

  /** The decision the run would make, derived the way the run derives it. */
  const decide = async (userId: string, now: Date) => {
    const facts = await readCadence([userId], now);
    const found = facts.get(userId);

    if (!found) throw new Error(`no cadence row for ${userId}`);

    return cadenceDecision(found, now);
  };

  const setLastActiveAt = (userId: string, lastActiveAt: Date | null) =>
    prisma.user.update({ where: { id: userId }, data: { lastActiveAt } });

  it("waits five days of dormancy before the first push", async () => {
    const user = await seedDormantUser(daysAgo(4));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });

    await setLastActiveAt(user.id, daysAgo(5));

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("treats a user it has never seen as away", async () => {
    // The column is only written for people who have made a request since it
    // shipped, so null has to mean unknown rather than here.
    const user = await seedDormantUser(null);

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("waits ten days after one unanswered push and twenty after two", async () => {
    const user = await seedDormantUser(daysAgo(60));

    await seedPush(user.id, daysAgo(9));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });

    await prisma.notificationLog.updateMany({ data: { sentAt: daysAgo(10) } });

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });

    // Two unanswered now, and the same ten days is no longer enough.
    await prisma.notificationLog.deleteMany();
    await seedPush(user.id, daysAgo(50));
    await seedPush(user.id, daysAgo(19));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });

    await prisma.notificationLog.updateMany({
      where: { sentAt: daysAgo(19) },
      data: { sentAt: daysAgo(20) },
    });

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("stops for six months after three unanswered pushes", async () => {
    const user = await seedDormantUser(daysAgo(120));

    await seedPush(user.id, daysAgo(60));
    await seedPush(user.id, daysAgo(50));
    await seedPush(user.id, daysAgo(40));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "gave_up",
    });

    // Still nothing at four months, which is where a schedule that kept
    // doubling would have started again.
    const fourMonths = new Date(NOW.getTime() + 80 * 24 * 60 * 60 * 1000);

    await expect(decide(user.id, fourMonths)).resolves.toEqual({
      allowed: false,
      reason: "gave_up",
    });

    // Six months after the last one, one more try.
    const sixMonths = new Date(NOW.getTime() + 141 * 24 * 60 * 60 * 1000);

    await expect(decide(user.id, sixMonths)).resolves.toEqual({
      allowed: true,
    });

    // Which also goes unanswered, so it buys another six months.
    await seedPush(user.id, sixMonths);

    const later = new Date(sixMonths.getTime() + 30 * 24 * 60 * 60 * 1000);

    await expect(decide(user.id, later)).resolves.toEqual({
      allowed: false,
      reason: "gave_up",
    });
  });

  it("puts somebody who came back on the normal schedule again", async () => {
    const user = await seedDormantUser(daysAgo(10));

    // Pushed twenty days ago, back in the app ten days ago, quiet since.
    await seedPush(user.id, daysAgo(20));

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });

    // Back three days ago instead, which is not dormant yet.
    await setLastActiveAt(user.id, daysAgo(3));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });
  });

  it("resets to the first gap when a response follows the second push", async () => {
    const user = await seedDormantUser(daysAgo(29));

    await seedPush(user.id, daysAgo(40));
    await seedPush(user.id, daysAgo(31));
    // The first push after they came back, itself unanswered.
    await seedPush(user.id, daysAgo(8));

    // Three pushes on the row, but only one of them since they were last seen,
    // so the wait is the first rung and not the six month pause.
    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });

    await prisma.notificationLog.updateMany({
      where: { sentAt: daysAgo(8) },
      data: { sentAt: daysAgo(10) },
    });

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("counts a response that lands after the next push went out", async () => {
    const user = await seedDormantUser(daysAgo(11));

    await seedPush(user.id, daysAgo(40));
    await seedPush(user.id, daysAgo(9));

    // Last seen before the second push, so that push is unanswered and the
    // ten day gap is still running.
    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });

    // Same rows, but they turned up the day after that push. The streak is
    // cleared even though the return was late.
    await setLastActiveAt(user.id, daysAgo(8));

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("never sends two pushes inside seven days", async () => {
    const user = await seedDormantUser(daysAgo(5));

    // Answered, dormant five days again, and the schedule would allow it. The
    // hard floor is the only thing in the way.
    await seedPush(user.id, daysAgo(6));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });

    await prisma.notificationLog.updateMany({ data: { sentAt: daysAgo(8) } });

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("never sends more than two pushes inside thirty days", async () => {
    const user = await seedDormantUser(daysAgo(14));

    await seedPush(user.id, daysAgo(25));
    await seedPush(user.id, daysAgo(15));

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "monthly_cap",
    });

    // The older of the two drops out of the window and the third is allowed.
    await prisma.notificationLog.updateMany({
      where: { sentAt: daysAgo(25) },
      data: { sentAt: daysAgo(35) },
    });

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("stops pushing a token the device no longer answers for", async () => {
    const user = await seedDormantUser(daysAgo(60));

    const dead = await seedPush(user.id, daysAgo(30), {
      ticketError: "DeviceNotRegistered",
    });

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "dead_token",
    });

    // The receipt says it half an hour later rather than the ticket saying it
    // straight away, and it means the same thing.
    await prisma.notificationLog.update({
      where: { id: dead.id },
      data: { ticketError: null, receiptError: "DeviceNotRegistered" },
    });

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "dead_token",
    });
  });

  it("lets a reinstall back in after a dead token", async () => {
    const user = await seedDormantUser(daysAgo(60));

    await seedPush(user.id, daysAgo(30), {
      receiptError: "DeviceNotRegistered",
    });

    // Registering a new token means opening the app, which is the same event
    // that clears the streak. Without this the reinstall would be muted for
    // good.
    await setLastActiveAt(user.id, daysAgo(20));

    await expect(decide(user.id, NOW)).resolves.toEqual({ allowed: true });
  });

  it("counts every kind against the same schedule", async () => {
    const user = await seedDormantUser(daysAgo(60));

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        kind: REENGAGEMENT_KINDS.LIKES_WAITING,
        dedupeKey: "a-different-kind",
        sentAt: daysAgo(3),
      },
    });

    await expect(decide(user.id, NOW)).resolves.toEqual({
      allowed: false,
      reason: "cooldown",
    });
  });
});

describe("Reengagement Push Suppressed", () => {
  /** One hour past {@link NOW}, so 19:00 local: the close of the window. */
  const WINDOW_CLOSE = new Date(NOW.getTime() + 60 * 60 * 1000);
  /** Two hours past, so 20:00 local: the first hour the slot is spent. */
  const AFTER_WINDOW = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);

  const suppressedCalls = () =>
    observability.capture.mock.calls.filter(
      ([event]) => event === "Reengagement Push Suppressed",
    );

  it("reports a cadence decision once, at the close of the window", async () => {
    const { requester } = await seedSilentMatch(25);

    await prisma.notificationLog.create({
      data: {
        userId: requester.userId,
        kind: REENGAGEMENT_KINDS.LIKES_WAITING,
        dedupeKey: "yesterday",
        sentAt: hoursAgo(2),
      },
    });

    // 18:00 local. The push is held back and counted, but the day is not over
    // so nothing is reported yet.
    const early = await ReengagementService.run(NOW);

    expect(early.suppressed.cooldown).toBe(1);
    expect(suppressedCalls()).toHaveLength(0);

    const close = await ReengagementService.run(WINDOW_CLOSE);

    expect(close.suppressed.cooldown).toBe(1);
    expect(suppressedCalls()).toEqual([
      [
        "Reengagement Push Suppressed",
        expect.objectContaining({
          kind: REENGAGEMENT_KINDS.UNANSWERED_MATCH,
          reason: "cooldown",
        }),
      ],
    ]);
  });

  it("reports a missed window at the hour after it closed", async () => {
    await seedSilentMatch(25, AFTER_WINDOW);

    const spent = await ReengagementService.run(AFTER_WINDOW);

    expect(spent.sent).toBe(0);
    expect(spent.suppressed.window).toBe(2);
    expect(suppressedCalls()).toHaveLength(2);
    expect(suppressedCalls()[0]?.[1]).toMatchObject({ reason: "window" });

    // The middle of the night is the same suppression and not worth a second
    // row for the same person on the same day.
    const night = await ReengagementService.run(
      new Date(AFTER_WINDOW.getTime() + 7 * 60 * 60 * 1000),
    );

    expect(night.suppressed.window).toBe(2);
    expect(suppressedCalls()).toHaveLength(2);
  });
});
