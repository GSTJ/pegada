import { ConnectionOptions, DefaultJobOptions } from "bullmq";

import { config } from "../shared/config";

export const redisConnection = {
  host: config.REDIS_HOST,
  username: config.REDIS_USERNAME,
  password: config.REDIS_PASSWORD,
  port: config.REDIS_PORT
} satisfies ConnectionOptions;

export const redisDefaultQueueOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: true
} satisfies DefaultJobOptions;
