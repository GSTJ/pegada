import { Queue } from "bullmq";

import { redisConnection, redisDefaultQueueOptions } from "../constants/redis";

export interface ICheckPushNotificationReceiptsJobData {
  receipts: {
    id: string;
    pushToken: string;
  }[];
}

export const CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE =
  "CheckPushNotificationReceipts";

export const CheckPushNotificationReceiptsQueue =
  new Queue<ICheckPushNotificationReceiptsJobData>(
    CHECK_PUSH_NOTIFICATION_RECEIPTS_QUEUE,
    {
      connection: redisConnection,
      defaultJobOptions: redisDefaultQueueOptions
    }
  );
