import { Worker } from "bullmq";

import { redisConnection } from "@pegada/api/constants/redis";
import { sendError } from "@pegada/api/errors/errors";
import {
  CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
  CheckPushNotificationReceiptsQueue,
  ICheckPushNotificationReceiptsJobData
} from "@pegada/api/queue/CheckPushNotificationReceiptsQueue";

import { expo } from "./shared/expo";
import { handlePushError } from "./shared/handlePushError";

export const RECEIPT_CHECK_DELAY_MS = 35 * 60 * 1000; /** 35 minutes */

export const worker = new Worker<ICheckPushNotificationReceiptsJobData>(
  CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
  async (job) => {
    try {
      const { receipts: incomingReceiptsData } = job.data;

      if (!incomingReceiptsData) return;

      const receipts = await expo.getPushNotificationReceiptsAsync(
        incomingReceiptsData.map(({ id }) => id)
      );

      let nonProcessedReceipts: typeof incomingReceiptsData = [];

      Object.entries(receipts).forEach(([id, receipt]) => {
        const pushToken = incomingReceiptsData.find(
          (receipt) => receipt.id === id
        )?.pushToken as string;

        if (receipt.status === "error" && receipt.details?.error) {
          return handlePushError(receipt.details?.error, pushToken);
        }

        if (receipt.status === "ok") return;

        nonProcessedReceipts.push({ id, pushToken });
      });

      if (!nonProcessedReceipts.length) return;

      sendError(
        `Some push notifications weren't processed. Receipts: ${JSON.stringify(nonProcessedReceipts)}`
      );

      // If there are remaining receipts (e.g. due to 'error' status), save them back to Redis.
      // Check again in X minutes.
      await CheckPushNotificationReceiptsQueue.add(
        CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
        { receipts: nonProcessedReceipts },
        { delay: RECEIPT_CHECK_DELAY_MS }
      );
    } catch (error) {
      sendError(error);
      throw error;
    }
  },

  { connection: redisConnection, concurrency: 1 }
);
