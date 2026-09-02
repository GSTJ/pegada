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

/** The two people a new match belongs to, as `createMatch` hands them back. */
type MatchParticipants = {
  requester: { id: string; createdAt: Date };
  responder: { id: string; createdAt: Date };
};

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

      return {
        match: existingMatch,
        notification: null,
        created: false,
        participants: null,
      };
    }

    const match = await db.match.create({
      data: {
        requesterId,
        responderId,
      },
      select: {
        id: true,
        requesterId: true,
        // Both users' ids and signup times ride along on the row that is being
        // written anyway. Analytics used to re-query for them after the commit,
        // which on a serverless runtime is a database round trip racing the
        // freeze that follows the response.
        requester: {
          select: { user: { select: { id: true, createdAt: true } } },
        },
        responder: {
          select: {
            name: true,
            user: {
              select: { id: true, createdAt: true, pushToken: true },
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
          userId: match.responder.user.id,
          pushKind: "match" as const,
        }
      : null;

    // `created` tells a first match apart from the caller re-finding one that
    // already existed. Both return a match; only one of them is an event.
    return {
      match: { id: match.id },
      notification,
      created: true,
      participants: {
        requester: match.requester.user,
        responder: match.responder.user,
      },
    };
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
   *
   * Synchronous, and reads nothing back from the database: both people arrive
   * on the row `createMatch` already wrote.
   */
  static captureMatchCreated({
    matchId,
    participants,
  }: {
    matchId: string;
    participants: MatchParticipants;
  }) {
    try {
      const { requester, responder } = participants;
      const now = new Date();

      captureEvent(requester.id, ANALYTICS_EVENTS.MATCH_CREATED, {
        match_id: matchId,
        other_user_id: responder.id,
        seconds_since_signup: secondsBetween(requester.createdAt, now),
      });

      captureEvent(responder.id, ANALYTICS_EVENTS.MATCH_CREATED, {
        match_id: matchId,
        other_user_id: requester.id,
        seconds_since_signup: secondsBetween(responder.createdAt, now),
      });
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
