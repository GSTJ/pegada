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

const PUSH_TOKEN = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]";

/** Salvador, Bahia. Longitude -38.5 puts the fixtures three hours behind UTC. */
const LONGITUDE = -38.5;
const LATITUDE = -12.97;

/** 15:00 in UTC-3, comfortably inside the send window. */
const NOW = new Date("2026-09-01T18:00:00.000Z");

/** 03:00 in UTC-3, inside quiet hours. */
const NIGHT = new Date("2026-09-01T06:00:00.000Z");

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
    generateFakeUserWithDog({ gender: "MALE" }, reachableUser()),
    generateFakeUserWithDog({ gender: "FEMALE" }, reachableUser()),
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
    expect(localHourFromLongitude(LONGITUDE, NOW)).toBe(15);
    expect(localHourFromLongitude(0, NOW)).toBe(18);
    expect(localHourFromLongitude(150, NOW)).toBe(4);
  });

  it("has no hour without a longitude", () => {
    expect(localHourFromLongitude(null, NOW)).toBeNull();
    expect(localHourFromLongitude(undefined, NOW)).toBeNull();
  });
});

describe("isWithinSendWindow", () => {
  it("sends during the day and stays quiet at night", () => {
    expect(isWithinSendWindow(LONGITUDE, NOW)).toBe(true);
    // 23:00 local.
    expect(
      isWithinSendWindow(LONGITUDE, new Date("2026-09-02T02:00:00.000Z")),
    ).toBe(false);
    // 06:00 local.
    expect(isWithinSendWindow(LONGITUDE, NIGHT)).toBe(false);
  });

  it("falls back to the early evening Sao Paulo slot without coordinates", () => {
    // 18:00 in UTC-3, and 19:00 so one missed cron run does not drop the
    // whole cohort for the day.
    expect(isWithinSendWindow(null, new Date("2026-09-01T21:00:00.000Z"))).toBe(
      true,
    );
    expect(isWithinSendWindow(null, new Date("2026-09-01T22:00:00.000Z"))).toBe(
      true,
    );
    // 20:00 in UTC-3, past the slot.
    expect(isWithinSendWindow(null, new Date("2026-09-01T23:00:00.000Z"))).toBe(
      false,
    );
    // 15:00 in UTC-3, fine for a located user but not for this one.
    expect(isWithinSendWindow(null, NOW)).toBe(false);
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
    const { user, dog } = await generateFakeUserWithDog(
      { gender: "MALE" },
      reachableUser(),
    );

    // Somebody they already swiped on, four days ago.
    const { dog: swiped } = await generateFakeUserWithDog(
      { gender: "FEMALE" },
      reachableUser({ pushToken: null }),
    );

    await prisma.interest.create({
      data: {
        requesterId: dog.id,
        responderId: swiped.id,
        swipeType: "INTERESTED",
        lastPositiveAt: daysAgo(4),
      },
    });

    const newDogs = [];
    for (const index of Array.from({ length: count }, (_value, i) => i)) {
      // oxlint-disable-next-line no-await-in-loop -- Fixture rows are created in order so their timestamps stay distinct.
      const { dog: newDog } = await generateFakeUserWithDog(
        { gender: "FEMALE", name: `New ${index}` },
        reachableUser({ pushToken: null }),
      );
      newDogs.push(newDog);
    }

    await prisma.dog.updateMany({
      where: { id: { in: newDogs.map(({ id }) => id) } },
      data: { createdAt: daysAgo(1) },
    });

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
      generateFakeUserWithDog({ gender: "FEMALE" }, reachableUser()),
      generateFakeUserWithDog(
        { gender: "MALE" },
        reachableUser({ pushToken: null }),
      ),
    ]);

    const interest = await prisma.interest.create({
      data: {
        requesterId: admirer.id,
        responderId: liked.id,
        swipeType: "INTERESTED",
        lastPositiveAt: hoursAgo(hours),
      },
    });

    await prisma.interest.update({
      where: { id: interest.id },
      data: { createdAt: hoursAgo(hours) },
    });

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

    await prisma.interest.create({
      data: {
        requesterId: liked.id,
        responderId: admirer.id,
        swipeType: "NOT_INTERESTED",
      },
    });

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

    const second = await ReengagementService.run(NOW);

    expect(second.sent).toBe(0);
    expect(second.skippedAlreadySent).toBe(2);
    expect(await prisma.notificationLog.count()).toBe(2);
  });

  it("holds a user to one push a day across different kinds", async () => {
    const { requester, responder } = await seedSilentMatch(25);

    // A waiting like for the same user, so there is a second kind queued.
    const { dog: admirer } = await generateFakeUserWithDog(
      { gender: "MALE" },
      reachableUser({ pushToken: null }),
    );
    const like = await prisma.interest.create({
      data: {
        requesterId: admirer.id,
        responderId: responder.id,
        swipeType: "INTERESTED",
        lastPositiveAt: hoursAgo(30),
      },
    });
    await prisma.interest.update({
      where: { id: like.id },
      data: { createdAt: hoursAgo(30) },
    });

    expect((await ReengagementService.run(NOW)).sent).toBe(2);

    // Two hours later the match keys are claimed but the like key is not, and
    // the daily cap is what has to stop it.
    const summary = await ReengagementService.run(
      new Date(NOW.getTime() + 2 * 60 * 60 * 1000),
    );

    expect(summary.sent).toBe(0);
    expect(summary.skippedCooldown).toBe(1);
    expect(requester.id).not.toBe(responder.id);
  });

  it("falls through to the next kind once the cap expires", async () => {
    const { responder } = await seedSilentMatch(25);

    const { dog: admirer } = await generateFakeUserWithDog(
      { gender: "MALE" },
      reachableUser({ pushToken: null }),
    );
    const like = await prisma.interest.create({
      data: {
        requesterId: admirer.id,
        responderId: responder.id,
        swipeType: "INTERESTED",
        lastPositiveAt: hoursAgo(30),
      },
    });
    await prisma.interest.update({
      where: { id: like.id },
      data: { createdAt: hoursAgo(30) },
    });

    await ReengagementService.run(NOW);

    // Age the log past the daily cap. The match nudge is still claimed, so a
    // user whose best candidate is spent has to reach their next one rather
    // than lose the day to it.
    await prisma.notificationLog.updateMany({ data: { sentAt: hoursAgo(30) } });

    const summary = await ReengagementService.run(NOW);

    expect(summary.sent).toBe(1);
    expect(summary.byKind[REENGAGEMENT_KINDS.LIKES_WAITING]).toBe(1);
  });

  it("sends nothing during quiet hours", async () => {
    await seedSilentMatch(25, NIGHT);

    const summary = await ReengagementService.run(NIGHT);

    expect(summary.sent).toBe(0);
    expect(summary.skippedQuietHours).toBe(2);
    expect(
      PushNotificationService.enqueuePushNotification,
    ).not.toHaveBeenCalled();
  });

  it("clears the alert request after answering it", async () => {
    const { user, dog } = await generateFakeUserWithDog(
      { gender: "MALE" },
      reachableUser({ newDogsAlertRequestedAt: daysAgo(2) }),
    );

    for (const index of [0, 1, 2]) {
      // oxlint-disable-next-line no-await-in-loop -- Fixture rows are created in order so their timestamps stay distinct.
      await generateFakeUserWithDog(
        { gender: "FEMALE", name: `New ${index}` },
        reachableUser({ pushToken: null }),
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
