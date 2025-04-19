import Expo from "expo-server-sdk";
import { z } from "zod";

import { sendError } from "../errors/errors";
import {
  ISendNotificationJobData,
  SEND_PUSH_NOTIFICATION_QUEUE,
  SendPushNotificationQueue
} from "../queue/SendPushNotificationQueue";
import { UserService } from "./UserService";

export class PushNotificationService {
  static async enqueuePushNotification(notification: ISendNotificationJobData) {
    try {
      const pushToken = z.string().parse(notification.to);

      if (!pushToken) {
        throw new Error("Please provide a push token");
      }

      if (!Expo.isExpoPushToken(pushToken)) {
        const error = new Error(
          `Push token ${pushToken} is not a valid Expo push token`
        );

        await UserService.blacklistPushToken(pushToken);

        throw error;
      }

      const waitingJobCount = await SendPushNotificationQueue.getWaitingCount();

      const DELAY_BETWEEN_NOTIFICATIONS_MS = 100;

      return await SendPushNotificationQueue.add(
        SEND_PUSH_NOTIFICATION_QUEUE,
        notification,
        { delay: waitingJobCount * DELAY_BETWEEN_NOTIFICATIONS_MS }
      );
    } catch (error) {
      sendError(error);
    }
  }
}
