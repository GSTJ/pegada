import type { ExpoPushMessage } from "expo-server-sdk";
import { Queue } from "bullmq";

import { redisConnection, redisDefaultQueueOptions } from "../constants/redis";

export type ISendNotificationJobData = ExpoPushMessage;

export const SEND_PUSH_NOTIFICATION_QUEUE = "SendPushNotification";

export const SendPushNotificationQueue = new Queue<ISendNotificationJobData>(
  SEND_PUSH_NOTIFICATION_QUEUE,
  { connection: redisConnection, defaultJobOptions: redisDefaultQueueOptions }
);
