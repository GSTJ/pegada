import { Worker } from "bullmq";

import type { ICheckPushNotificationReceiptsJobData } from "@pegada/api/queue/CheckPushNotificationReceiptsQueue";
import { redisConnection } from "@pegada/api/constants/redis";
import { sendError } from "@pegada/api/errors/errors";
import {
  CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
  CheckPushNotificationReceiptsQueue
} from "@pegada/api/queue/CheckPushNotificationReceiptsQueue";

import { expo } from "./shared/expo";
import { handlePushError } from "./shared/handlePushError";

export const RECEIPT_CHECK_DELAY_MS = 35 * 60 * 1000; /** 35 minutes */

export const worker = new Worker<ICheckPushNotificationReceiptsJobData>(
  CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
  async (job) => {
    try {
      const { receipts: incomingReceiptsData } = job.data;

      // `receipts` field is always present per queue contract

      const receipts = await expo.getPushNotificationReceiptsAsync(
        incomingReceiptsData.map(({ id }) => id)
      );

      const nonProcessedReceipts: typeof incomingReceiptsData = [];

      for (const [id, receipt] of Object.entries(receipts)) {
        const found = incomingReceiptsData.find((r) => r.id === id);

        if (!found) {
          continue;
        }

        const { pushToken } = found;

        if (receipt.status === "error" && receipt.details?.error) {
          // We don't need to await the error handler here – fire-and-forget.
          void handlePushError(receipt.details.error, pushToken);
          continue;
        }

        if (receipt.status === "ok") continue;

        nonProcessedReceipts.push({ id, pushToken });
      }

      if (nonProcessedReceipts.length === 0) return;

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
