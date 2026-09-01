import type { Language } from "@pegada/shared/i18n/types/types";
import type { Prisma } from "@prisma/client";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dog-schema";

import { dogSelect } from "../dtos/dog-dto";
import { sendError } from "../errors/errors";
import { captureEvent, secondsBetween } from "../shared/analytics";
import { transformDistanceBetweenUserAndDog } from "../shared/dog-distance";
import { PushNotificationService } from "./push-notification-service";
import { TranslationService } from "./translation-service";

class MatchService {
  language?: Language;

  constructor(props: { language?: Language }) {
    this.language = props.language;
  }

  async createMatch(
    requesterId: string,
    responderId: string,
    db: Pick<Prisma.TransactionClient, "match">,
  ) {
    const existingMatches = await db.match.findMany({
      where: {
        deletedAt: null,
        OR: [
          { requesterId, responderId },
          { requesterId: responderId, responderId: requesterId },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const [existingMatch, ...duplicates] = existingMatches;
    if (existingMatch) {
      if (duplicates.length > 0) {
        await db.match.updateMany({
          where: { id: { in: duplicates.map(({ id }) => id) } },
          data: { deletedAt: new Date() },
        });
        sendError("Duplicate active matches were closed");
      }

      return { match: existingMatch, notification: null, created: false };
    }

    const match = await db.match.create({
      data: {
        requesterId,
        responderId,
      },
      select: {
        id: true,
        requesterId: true,
        responder: {
          select: {
            name: true,
            user: {
              select: { pushToken: true },
            },
          },
        },
      },
    });

    const notification = match.responder.user.pushToken
      ? {
          to: match.responder.user.pushToken,
          title: TranslationService.translate(
            "server:notification.match.title",
            {
              lng: this.language,
              replace: { name: match.responder.name },
            },
          ),
          body: TranslationService.translate("server:notification.match.body", {
            lng: this.language,
          }),
          data: {
            url: `match/${match.id}/${match.requesterId}`,
          },
        }
      : null;

    // `created` tells a first match apart from the caller re-finding one that
    // already existed. Both return a match; only one of them is an event.
    return { match: { id: match.id }, notification, created: true };
  }

  /**
   * Records a new match against both people, one capture each.
   *
   * PostHog attributes an event to a single person, and a match belongs to two.
   * Sent twice, from each side's point of view, so "matched" is a step both
   * users' funnels can contain — a single event would make the responder look
   * like someone who never matched.
   *
   * `seconds_since_signup` is what turns this into a cohort answer: how long a
   * new user waits for their first match is the number that decides whether
   * they come back.
   */
  static async captureMatchCreated({
    matchId,
    requesterDogId,
    responderDogId,
  }: {
    matchId: string;
    requesterDogId: string;
    responderDogId: string;
  }) {
    try {
      const dogs = await prisma.dog.findMany({
        where: { id: { in: [requesterDogId, responderDogId] } },
        select: { id: true, user: { select: { id: true, createdAt: true } } },
      });

      const now = new Date();

      const pairs = dogs
        .map((dog) => ({ dog, other: dogs.find(({ id }) => id !== dog.id) }))
        .filter((pair) => Boolean(pair.other));

      for (const { dog, other } of pairs) {
        captureEvent(dog.user.id, ANALYTICS_EVENTS.MATCH_CREATED, {
          match_id: matchId,
          other_user_id: other?.user.id ?? "",
          seconds_since_signup: secondsBetween(dog.user.createdAt, now),
        });
      }
    } catch (error) {
      sendError(error);
    }
  }

  async sendMatchNotification(
    notification: NonNullable<
      Awaited<ReturnType<MatchService["createMatch"]>>["notification"]
    >,
  ) {
    try {
      await PushNotificationService.enqueuePushNotification(notification);
    } catch (error) {
      sendError(error);
    }
  }

  static async getMatchesForDog(dogId: string) {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ requesterId: dogId }, { responderId: dogId }],
        AND: {
          deletedAt: null,
          requester: {
            deletedAt: null,
            banned: false,
            images: {
              // Shadowban
              some: { status: IMAGE_STATUS.APPROVED },
              none: { status: IMAGE_STATUS.REJECTED },
            },
          },
          responder: {
            deletedAt: null,
            banned: false,
            images: {
              // Shadowban
              some: { status: IMAGE_STATUS.APPROVED },
              none: { status: IMAGE_STATUS.REJECTED },
            },
          },
        },
      },
      include: {
        requester: {
          select: dogSelect,
        },
        responder: {
          select: dogSelect,
        },
        messages: {
          orderBy: { createdAt: "desc" },
          where: { deletedAt: null },
          take: 1,
        },
      },
      orderBy: {
        messages: {
          _count: "desc",
        },
      },
    });

    // Prepare a list of matched dogs
    const matchedDogs = matches.map((match) => {
      const currentDog =
        match.requester.id === dogId ? match.requester : match.responder;

      const otherDog =
        match.requester.id === dogId ? match.responder : match.requester; // Get the dog that is not the current dog

      const dog = transformDistanceBetweenUserAndDog(otherDog, currentDog.user);

      return {
        id: match.id,
        dog,
        lastMessage: match.messages[0],
        interest: undefined,
        // TODO: Removed to improve performance, implement a better way later
        // interest: await prisma.interest.findFirst({
        //   where: {
        //     requesterId: dogId,
        //     responderId: otherDog.id,
        //     swipeType: 'MAYBE',
        //     deletedAt: null,
        //   },
        //   select: {
        //     swipeType: true,
        //   },
        //   orderBy: { createdAt: 'desc' },
        // }),
      };
    });

    return Promise.all(matchedDogs);
  }
}

export default MatchService;
