import { Queue } from "bullmq";

import type { Language } from "@pegada/shared/i18n/types/types";

import { redisConnection, redisDefaultQueueOptions } from "../constants/redis";

export interface IMailJobData {
  email: string;
  code: string;
  language?: Language;
}

export const MAIL_QUEUE = "Mail";

export const MailQueue = new Queue<IMailJobData>(MAIL_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: redisDefaultQueueOptions
});
