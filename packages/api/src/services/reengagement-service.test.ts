import prisma from "@pegada/database";
import { breedData } from "@pegada/database/fixtures/breed-data";
import { generateFakeUserWithDog } from "@pegada/database/fixtures/generate-fake-user-with-dog";

import {
  isWithinSendWindow,
  localHourFromLongitude,
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

  it("holds a user to one push a day across different kinds", async () => {
    const { requester, responder } = await seedSilentMatch(25);

    // A waiting like for the same user, so there is a second kind queued.
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

    expect((await ReengagementService.run(NOW)).sent).toBe(2);

    // An hour later, still in the window: the match keys are claimed but the
    // like key is not, and the daily cap is what has to stop it.
    const summary = await ReengagementService.run(
      new Date(NOW.getTime() + 60 * 60 * 1000),
    );

    expect(summary.sent).toBe(0);
    expect(summary.skippedCooldown).toBe(1);
    expect(requester.id).not.toBe(responder.id);
  });

  it("does not let the daily cap drift out of the evening slot", async () => {
    // 18:00 in Sao Paulo, the first of the two fallback hours.
    const eveningSlot = new Date("2026-09-01T21:00:00.000Z");
    const { requester } = await seedSilentMatch(25, eveningSlot);

    // No coordinates, so this user only ever gets the evening slot.
    await prisma.user.updateMany({
      data: { latitude: null, longitude: null },
    });

    /** Nudged at yesterday's 19:00 slot, then run at today's 18:00 one. */
    const runAfterPreviousNudge = async (hoursSince: number) => {
      await prisma.notificationLog.deleteMany();
      await prisma.notificationLog.create({
        data: {
          userId: requester.userId,
          kind: REENGAGEMENT_KINDS.UNANSWERED_MATCH,
          dedupeKey: `yesterday:${hoursSince}`,
          sentAt: hoursBefore(eveningSlot, hoursSince),
        },
      });

      return ReengagementService.run(eveningSlot);
    };

    // An hour earlier in the evening than yesterday's send is exactly the
    // case a 24 hour window pushed into the following day.
    const onTime = await runAfterPreviousNudge(23);

    expect(onTime.skippedCooldown).toBe(0);
    expect(onTime.sent).toBe(2);

    // Well inside the same day, still held back.
    const tooSoon = await runAfterPreviousNudge(2);

    expect(tooSoon.skippedCooldown).toBe(1);
  });

  it("falls through to the next kind once the cap expires", async () => {
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

    // Age the log past the daily cap. The match nudge is still claimed, so a
    // user whose best candidate is spent has to reach their next one rather
    // than lose the day to it.
    await prisma.notificationLog.updateMany({ data: { sentAt: hoursAgo(30) } });

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
    expect(burst.skippedOutsideWindow).toBe(2);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).not.toHaveBeenCalled();

    // The same two candidates three hours later, now 19:00 local.
    const evening = await ReengagementService.run(
      new Date("2026-09-02T22:00:00.000Z"),
    );

    expect(evening.sent).toBe(2);
  });

  it("nudges about waiting likes once a week, not once a day", async () => {
    const { user, dog: liked } = await seedUserWithDog(
      { gender: "FEMALE" },
      reachableUser(),
    );

    /** Seven admirers, oldest like first, all of them waiting over a day. */
    const likes: { id: string }[] = [];
    for (const index of [0, 1, 2, 3, 4, 5, 6]) {
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
          lastPositiveAt: hoursAgo(40 - index),
        },
        hoursAgo(40 - index),
      );

      likes.push(like);
    }

    const first = await ReengagementService.run(NOW);

    expect(first.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(1);

    /**
     * The next evening slot, with the like that was announced taken off the
     * board. A swipe back does exactly this, and it is what moves the anchor
     * the dedupe key is built from: every one of these days offers a key that
     * has never been claimed, so the weekly floor is the only thing left
     * holding the nudge back.
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

    for (const day of [1, 2, 3, 4, 5, 6]) {
      // oxlint-disable-next-line no-await-in-loop -- Each day has to see the log the previous day wrote.
      const summary = await runOnDay(day);

      expect(summary.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(0);
    }

    await expect(
      prisma.notificationLog.count({
        where: { userId: user.id, kind: REENGAGEMENT_KINDS.LIKES_WAITING },
      }),
    ).resolves.toBe(1);

    // A week on, the floor has passed and the likes still sitting there are
    // worth one more nudge.
    const nextWeek = await ReengagementService.run(
      new Date(NOW.getTime() + 8 * 24 * 60 * 60 * 1000),
    );

    expect(nextWeek.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(1);
  });

  it("sends nothing outside the evening window", async () => {
    await seedSilentMatch(25, NIGHT);

    const summary = await ReengagementService.run(NIGHT);

    expect(summary.sent).toBe(0);
    expect(summary.skippedOutsideWindow).toBe(2);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).not.toHaveBeenCalled();

    // The same two candidates, unchanged, at that day's 18:00 local slot. The
    // pair is the point: it is the hour deciding, not anything else about the
    // fixture, and the night run left nothing behind that blocks the evening.
    const evening = await ReengagementService.run(NOW);

    expect(evening.sent).toBe(2);
    expect(evening.skippedOutsideWindow).toBe(0);
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
