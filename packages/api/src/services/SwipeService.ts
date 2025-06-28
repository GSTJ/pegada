import { PlanType } from "@prisma/client";
import { addDays, setHours } from "date-fns";
import { getDistance } from "geolib";
import { z } from "zod";

import prisma from "@pegada/database";
import { FREE_DAILY_SWIPE_LIMIT } from "@pegada/shared/constants/constants";
import { LikeLimitReached } from "@pegada/shared/errors/errors";
import { Language } from "@pegada/shared/i18n/types/types";

import { dogSafeSchema } from "../dtos/dogDto";
import { sendError } from "../errors/errors";
import { DogService } from "./DogService";
import MatchService from "./MatchService";
import { PushNotificationService } from "./PushNotificationService";
import { TranslationService } from "./TranslationService";
import { UserService } from "./UserService";

type DogSafeSchema = z.infer<typeof dogSafeSchema>;

type IWithUser = Omit<DogSafeSchema, "distance" | "user"> & {
  user: { latitude?: number | null; longitude?: number | null; plan: PlanType };
};
export class SwipeService {
  language?: Language;

  constructor(props: { language?: Language }) {
    this.language = props.language;
  }

  static transformDistanceBetweenUserAndDog<
    T extends IWithUser,
    V extends IWithUser["user"]
  >(dog: T, user: V): DogSafeSchema {
    const { user: owner, ...dogWithoutOwner } = dog;

    if (
      !owner?.latitude ||
      !owner?.longitude ||
      !user?.latitude ||
      !user?.longitude
    ) {
      return {
        ...dogWithoutOwner,
        distance: null,
        user: { plan: user.plan }
      };
    }

    const distanceInMeters = getDistance(
      { latitude: owner.latitude, longitude: owner.longitude },
      {
        latitude: user.latitude,
        longitude: user.longitude
      },
      1000
    );

    const distance = distanceInMeters / 1000;

    return {
      ...dogWithoutOwner,
      user: { plan: user.plan },
      distance
    };
  }

  async sendLikeNotification(dogId: string) {
    try {
      const dog = await prisma.dog.findFirst({
        where: { id: dogId, deletedAt: null },
        include: { user: true }
      });

      if (!dog?.user.pushToken) return;

      await PushNotificationService.enqueuePushNotification({
        to: dog.user.pushToken,
        title: TranslationService.translate("server:notification.like.title", {
          lng: this.language,
          replace: { name: dog.name }
        }),
        body: TranslationService.translate("server:notification.like.body", {
          lng: this.language
        })
      });
    } catch (error) {
      sendError(error);
    }
  }

  async getRemainingDailyLikes({
    userId,
    dogId
  }: {
    userId: string;
    dogId: string;
  }) {
    const userPlan = await UserService.getSubscriptionType(userId);

    // Only apply daily swipe limit to free users
    if (userPlan !== PlanType.FREE) return { remainingSwipes: Infinity };

    const today = setHours(new Date(), 0);
    const dailyLikeCount = await prisma.interest.findMany({
      where: {
        requesterId: dogId,
        updatedAt: { gte: today },
        deletedAt: null,
        swipeType: { notIn: ["NOT_INTERESTED"] }
      },
      take: FREE_DAILY_SWIPE_LIMIT
    });

    const remainingSwipes = FREE_DAILY_SWIPE_LIMIT - dailyLikeCount.length;

    if (remainingSwipes > 0) return { remainingSwipes };

    // If the user has reached their daily swipe limit, return the time at which the limit will reset
    const oldestLike = dailyLikeCount[dailyLikeCount.length - 1]!;
    return {
      remainingSwipes,
      likeLimitResetAt: addDays(oldestLike.updatedAt, 1)
    };
  }

  async swipeDog({
    requester,
    responderId,
    swipeType,
    userId
  }: {
    requester: NonNullable<
      Awaited<ReturnType<(typeof DogService)["getFullDogByUserId"]>>
    >;
    responderId: string;
    swipeType: "NOT_INTERESTED" | "MAYBE" | "INTERESTED";
    userId: string;
  }) {
    let remainingDailyLikes;

    if (swipeType !== "NOT_INTERESTED") {
      remainingDailyLikes = await this.getRemainingDailyLikes({
        userId,
        dogId: requester.id
      });

      if (remainingDailyLikes.likeLimitResetAt) {
        throw new LikeLimitReached({
          likeLimitResetAt: remainingDailyLikes.likeLimitResetAt
        });
      }
    }

    const { interest, previousStatus } =
      await SwipeService.createOrUpdateInterest(
        requester.id,
        responderId,
        swipeType
      );

    if (swipeType === "NOT_INTERESTED") {
      if (previousStatus) {
        const existingMatch = await prisma.match.findFirst({
          where: {
            deletedAt: null,
            OR: [
              { requesterId: requester.id, responderId },
              // Inverted match
              { requesterId: responderId, responderId: requester.id }
            ]
          }
        });

        if (existingMatch) {
          await prisma.match.update({
            where: { id: existingMatch.id },
            data: { deletedAt: new Date() }
          });
        }
      }

      if (!remainingDailyLikes) {
        return { interest };
      }

      return { interest, remainingDailyLikes };
    }

    const hasMutualInterest = await SwipeService.checkForMutualInterest(
      responderId,
      requester.id
    );

    // Needs to have at least one approved image and no rejected images to be able to send notifications
    const isRequesterShadowbanned = requester.images.some(
      (image) => image.status === "REJECTED"
    );

    const requesterHasImages = requester.images.some(
      (image) => image.status === "APPROVED"
    );

    const canSendNotifications = !isRequesterShadowbanned && requesterHasImages;

    if (!hasMutualInterest) {
      if (canSendNotifications) {
        await this.sendLikeNotification(responderId);
      }
      return { interest };
    }

    const matchService = new MatchService({ language: this.language });
    const match = await matchService.createMatch(requester.id, responderId);

    return { interest, match };
  }

  static async createOrUpdateInterest(
    requesterId: string,
    responderId: string,
    swipeType: "INTERESTED" | "MAYBE" | "NOT_INTERESTED"
  ) {
    const existingInterest = await prisma.interest.findFirst({
      where: { requesterId, responderId, deletedAt: null }
    });

    const previousStatus = existingInterest ? existingInterest.swipeType : "";

    const interest = existingInterest
      ? await prisma.interest.update({
          where: { id: existingInterest.id },
          data: { swipeType }
        })
      : await prisma.interest.create({
          data: { requesterId, responderId, swipeType }
        });

    return { interest, previousStatus };
  }

  static async checkForMutualInterest(
    requesterId: string,
    responderId: string
  ) {
    const mutualInterest = await prisma.interest.findFirst({
      where: {
        requesterId,
        responderId,
        swipeType: {
          in: ["INTERESTED", "MAYBE"]
        },
        deletedAt: null
      }
    });

    return mutualInterest;
  }
}
