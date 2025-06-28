import prisma from "@pegada/database";
import { Language } from "@pegada/shared/i18n/types/types";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { dogSelect } from "../dtos/dogDto";
import { sendError } from "../errors/errors";
import { PushNotificationService } from "./PushNotificationService";
import { SwipeService } from "./SwipeService";
import { TranslationService } from "./TranslationService";

class MatchService {
  language?: Language;

  constructor(props: { language?: Language }) {
    this.language = props.language;
  }

  async createMatch(requesterId: string, responderId: string) {
    const existingMatch = await prisma.match.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { requesterId: requesterId, responderId: responderId },
          { requesterId: responderId, responderId: requesterId }
        ]
      }
    });

    if (existingMatch) {
      sendError("Match already exists");
      return existingMatch;
    }

    const match = await prisma.match.create({
      data: {
        requesterId,
        responderId
      },
      include: {
        responder: {
          include: {
            user: true
          }
        }
      }
    });

    if (match.responder.user.pushToken) {
      await PushNotificationService.enqueuePushNotification({
        to: match.responder.user.pushToken,
        title: TranslationService.translate("server:notification.match.title", {
          lng: this.language,
          replace: { name: match.responder.name }
        }),
        body: TranslationService.translate("server:notification.match.body", {
          lng: this.language
        }),
        data: {
          url: `match/${match.id}/${match.requesterId}`
        }
      });
    }

    return match;
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
              none: { status: IMAGE_STATUS.REJECTED }
            }
          },
          responder: {
            deletedAt: null,
            banned: false,
            images: {
              // Shadowban
              some: { status: IMAGE_STATUS.APPROVED },
              none: { status: IMAGE_STATUS.REJECTED }
            }
          }
        }
      },
      include: {
        requester: {
          select: dogSelect
        },
        responder: {
          select: dogSelect
        },
        messages: {
          orderBy: { createdAt: "desc" },
          where: { deletedAt: null },
          take: 1
        }
      },
      orderBy: {
        messages: {
          _count: "desc"
        }
      }
    });

    // Prepare a list of matched dogs
    const matchedDogs = matches.map(async (match) => {
      const currentDog =
        match.requester.id === dogId ? match.requester : match.responder;

      const otherDog =
        match.requester.id === dogId ? match.responder : match.requester; // Get the dog that is not the current dog

      const dog = SwipeService.transformDistanceBetweenUserAndDog(
        otherDog,
        currentDog.user
      );

      return {
        id: match.id,
        dog,
        lastMessage: match.messages[0],
        interest: undefined
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
