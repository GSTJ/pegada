import Expo from "expo-server-sdk";
import { z } from "zod";

import { sendError } from "../errors/errors";
import { enqueue } from "../queue/enqueue";
import { ISendNotificationJobData, TOPICS } from "../queue/topics";
import { UserService } from "./UserService";

export class PushNotificationService {
  static async enqueuePushNotification(notification: ISendNotificationJobData) {
    try {
      const pushToken = z.string().parse(notification.to);

      if (!pushToken) {
        throw new Error("Please provide a push token");
      }

      if (!Expo.isExpoPushToken(pushToken)) {
        const error = new Error(`Push token ${pushToken} is not a valid Expo push token`);

        await UserService.blacklistPushToken(pushToken);

        throw error;
      }

      // The old BullMQ path spaced sends by queue depth to respect Expo
      // rate limits; expo-server-sdk already throttles per client and
      // Vercel Queues retries on 429s, so the send goes straight through.
      return await enqueue(TOPICS.SEND_PUSH, notification);
    } catch (error) {
      sendError(error);
    }
  }
}
