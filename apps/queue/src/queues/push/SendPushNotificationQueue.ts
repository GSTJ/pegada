import { ExpoPushMessage } from "expo-server-sdk";
import { Worker } from "bullmq";

import { redisConnection } from "@pegada/api/constants/redis";
import { sendError } from "@pegada/api/errors/errors";
import {
  CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
  CheckPushNotificationReceiptsQueue
} from "@pegada/api/queue/CheckPushNotificationReceiptsQueue";
import {
  ISendNotificationJobData,
  SEND_PUSH_NOTIFICATION_QUEUE
} from "@pegada/api/queue/SendPushNotificationQueue";

import { RECEIPT_CHECK_DELAY_MS } from "./CheckPushNotificationReceiptsQueue";
import { expo } from "./shared/expo";
import { handlePushError } from "./shared/handlePushError";

const RECEIPT_EXPIRATION_MIN = 24 * 60 * 60; /** 24 hours */

export const worker = new Worker<ISendNotificationJobData>(
  SEND_PUSH_NOTIFICATION_QUEUE,
  async (job) => {
    try {
      const message: ExpoPushMessage = {
        sound: "default",
        priority: "high",
        channelId: "default", // replace with your channelId
        expiration: Math.floor(Date.now() / 1000) + RECEIPT_EXPIRATION_MIN, // Expires in 24 hours
        badge: 1,
        ...job.data
      };

      const pushToken = job.data.to as string;

      const tickets = await expo.sendPushNotificationsAsync([message]);

      const receipts: { id: string; pushToken: string }[] = [];

      for (const ticket of tickets) {
        // NOTE: If a ticket contains an error code in ticket.details.error, you
        // must handle it appropriately. The error codes are listed in the Expo
        // documentation:
        // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
        if (ticket.status === "error") {
          if (ticket.details && ticket.details.error) {
            handlePushError(ticket.details?.error, pushToken);
          }
          continue;
        }

        // NOTE: Not all tickets have IDs; for example, tickets for notifications
        // that could not be enqueued will have error information and no receipt ID.
        if (ticket.id) {
          receipts.push({ id: ticket.id, pushToken });
        }
      }

      CheckPushNotificationReceiptsQueue.add(
        CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
        { receipts },
        { delay: RECEIPT_CHECK_DELAY_MS }
      );
    } catch (error) {
      sendError(error);

      throw error;
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
