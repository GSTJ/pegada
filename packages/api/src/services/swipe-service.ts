import type { DogService } from "./dog-service";
import type { Language } from "@pegada/shared/i18n/types/types";
import type { Prisma } from "@prisma/client";

import prisma from "@pegada/database";
import { FREE_DAILY_SWIPE_LIMIT } from "@pegada/shared/constants/constants";
import {
  AccountBlockedError,
  DogUnavailableError,
  LikeLimitReachedError,
} from "@pegada/shared/errors/errors";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";
import { PlanType } from "@prisma/client";
import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";

import { sendError } from "../errors/errors";
import MatchService from "./match-service";
import { PushNotificationService } from "./push-notification-service";
import { TranslationService } from "./translation-service";

type InterestDatabase = Pick<Prisma.TransactionClient, "interest">;
type QuotaDatabase = Pick<Prisma.TransactionClient, "interest" | "user">;

const lockTransaction = async (db: Prisma.TransactionClient, key: string) => {
  await db.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text
  `;
};

const swipePairKey = (firstDogId: string, secondDogId: string) =>
  [firstDogId, secondDogId].sort().join(":");

export class SwipeService {
  language?: Language;

  constructor(props: { language?: Language }) {
    this.language = props.language;
  }

  async sendLikeNotification(dogId: string) {
    try {
      const dog = await prisma.dog.findFirst({
        where: {
          id: dogId,
          banned: false,
          deletedAt: null,
          user: { deletedAt: null },
        },
        include: { user: true },
      });

      if (!dog?.user.pushToken) return;

      await PushNotificationService.enqueuePushNotification({
        to: dog.user.pushToken,
        title: TranslationService.translate("server:notification.like.title", {
          lng: this.language,
          replace: { name: dog.name },
        }),
        body: TranslationService.translate("server:notification.like.body", {
          lng: this.language,
        }),
      });
    } catch (error) {
      sendError(error);
    }
  }

  async getRemainingDailyLikes({
    userId,
    db = prisma,
  }: {
    userId: string;
    db?: QuotaDatabase;
  }) {
    const user = await db.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { plan: true },
    });

    if (!user) throw new AccountBlockedError();

    // Only apply daily swipe limit to free users
    if (user.plan !== PlanType.FREE) return { remainingSwipes: Infinity };

    const windowStart = subDays(new Date(), 1);
    const dailyLikeCount = await db.interest.findMany({
      where: {
        requester: { userId },
        lastPositiveAt: { gte: windowStart },
      },
      orderBy: { lastPositiveAt: "desc" },
      select: { lastPositiveAt: true },
      take: FREE_DAILY_SWIPE_LIMIT,
    });

    const remainingSwipes = FREE_DAILY_SWIPE_LIMIT - dailyLikeCount.length;

    if (remainingSwipes > 0) return { remainingSwipes };

    // If the user has reached their daily swipe limit, return the time at which the limit will reset
    const oldestLike = dailyLikeCount.at(-1);
    if (!oldestLike?.lastPositiveAt) return { remainingSwipes };

    return {
      remainingSwipes,
      likeLimitResetAt: addDays(oldestLike.lastPositiveAt, 1),
    };
  }

  async swipeDog({
    requester,
    responderId,
    swipeType,
    userId,
  }: {
    requester: NonNullable<
      Awaited<ReturnType<(typeof DogService)["getFullDogByUserId"]>>
    >;
    responderId: string;
    swipeType: "NOT_INTERESTED" | "MAYBE" | "INTERESTED";
    userId: string;
  }) {
    if (responderId === requester.id) throw new DogUnavailableError();

    const isRequesterShadowbanned = requester.images.some(
      (image) => image.status === "REJECTED",
    );
    const requesterHasImages = requester.images.some(
      (image) => image.status === "APPROVED",
    );
    const canSendNotifications = !isRequesterShadowbanned && requesterHasImages;
    const matchService = new MatchService({ language: this.language });
    const result = await prisma.$transaction(
      async (tx) => {
        await lockTransaction(tx, `swipe-user:${userId}`);
        await lockTransaction(
          tx,
          `swipe-pair:${swipePairKey(requester.id, responderId)}`,
        );

        const activeRequester = await tx.dog.findFirst({
          where: {
            id: requester.id,
            userId,
            banned: false,
            deletedAt: null,
            user: { deletedAt: null },
          },
          select: { id: true },
        });

        if (!activeRequester) throw new AccountBlockedError();

        const responder = await tx.dog.findFirst({
          where: {
            id: responderId,
            banned: false,
            deletedAt: null,
            user: { deletedAt: null },
            images: {
              some: { status: IMAGE_STATUS.APPROVED },
              none: { status: IMAGE_STATUS.REJECTED },
            },
          },
          select: { id: true },
        });

        if (!responder) throw new DogUnavailableError();

        if (swipeType !== "NOT_INTERESTED") {
          const alreadyCounted = await tx.interest.findUnique({
            where: {
              requesterId_responderId: {
                requesterId: requester.id,
                responderId,
              },
              lastPositiveAt: { gte: subDays(new Date(), 1) },
            },
            select: { id: true },
          });

          if (!alreadyCounted) {
            const remainingDailyLikes = await this.getRemainingDailyLikes({
              userId,
              db: tx,
            });

            if (remainingDailyLikes.likeLimitResetAt) {
              throw new LikeLimitReachedError({
                likeLimitResetAt: remainingDailyLikes.likeLimitResetAt,
              });
            }
          }
        }

        const { interest } = await SwipeService.createOrUpdateInterest(
          requester.id,
          responderId,
          swipeType,
          tx,
        );

        if (swipeType === "NOT_INTERESTED") {
          await tx.match.updateMany({
            where: {
              deletedAt: null,
              OR: [
                { requesterId: requester.id, responderId },
                { requesterId: responderId, responderId: requester.id },
              ],
            },
            data: { deletedAt: new Date() },
          });

          return {
            interest,
            match: null,
            matchParticipants: null,
            matchNotification: null,
            sendLikeNotification: false,
          };
        }

        const hasMutualInterest = await SwipeService.checkForMutualInterest(
          responderId,
          requester.id,
          tx,
        );

        if (!hasMutualInterest) {
          return {
            interest,
            match: null,
            matchParticipants: null,
            matchNotification: null,
            sendLikeNotification: canSendNotifications,
          };
        }

        const { match, notification, created, participants } =
          await matchService.createMatch(requester.id, responderId, tx);

        return {
          interest,
          match,
          matchParticipants: created ? participants : null,
          matchNotification: notification,
          sendLikeNotification: false,
        };
      },
      { timeout: 10_000 },
    );

    // After the commit, so a rolled-back transaction cannot report a match that
    // does not exist. Synchronous and database-free — both users came back on
    // the row `createMatch` wrote — so there is no promise left running into a
    // serverless freeze, and `captureMatchCreated` swallows its own failures.
    if (result.matchParticipants && result.match) {
      MatchService.captureMatchCreated({
        matchId: result.match.id,
        participants: result.matchParticipants,
      });
    }

    if (result.matchNotification) {
      await matchService.sendMatchNotification(result.matchNotification);
    } else if (result.sendLikeNotification) {
      await this.sendLikeNotification(responderId);
    }

    return result.match
      ? { interest: result.interest, match: result.match }
      : { interest: result.interest };
  }

  static async createOrUpdateInterest(
    requesterId: string,
    responderId: string,
    swipeType: "INTERESTED" | "MAYBE" | "NOT_INTERESTED",
    db: InterestDatabase = prisma,
  ) {
    const existingInterest = await db.interest.findUnique({
      where: {
        requesterId_responderId: { requesterId, responderId },
      },
    });

    const previousStatus = existingInterest?.swipeType ?? "";
    const recentPositiveAt =
      existingInterest?.lastPositiveAt &&
      existingInterest.lastPositiveAt >= subDays(new Date(), 1)
        ? existingInterest.lastPositiveAt
        : null;
    const lastPositiveAt =
      swipeType === "NOT_INTERESTED"
        ? existingInterest?.lastPositiveAt
        : (recentPositiveAt ?? new Date());

    const interest = await db.interest.upsert({
      where: {
        requesterId_responderId: { requesterId, responderId },
      },
      create: {
        requesterId,
        responderId,
        swipeType,
        lastPositiveAt,
      },
      update: {
        swipeType,
        deletedAt: null,
        lastPositiveAt,
      },
    });

    return { interest, previousStatus };
  }

  static async checkForMutualInterest(
    requesterId: string,
    responderId: string,
    db: InterestDatabase = prisma,
  ) {
    const mutualInterest = await db.interest.findFirst({
      where: {
        requesterId,
        responderId,
        swipeType: {
          in: ["INTERESTED", "MAYBE"],
        },
        deletedAt: null,
      },
    });

    return mutualInterest;
  }
}
