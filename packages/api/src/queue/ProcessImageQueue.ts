import { Image } from "@prisma/client";
import { Queue } from "bullmq";

import { redisConnection, redisDefaultQueueOptions } from "../constants/redis";

export type IProcessImageJobData = Partial<Image> & { id: string; url: string };

export const PROCESS_IMAGE_QUEUE = "ProcessImage";

export const ProcessImageQueue = new Queue<IProcessImageJobData>(
  PROCESS_IMAGE_QUEUE,
  { connection: redisConnection, defaultJobOptions: redisDefaultQueueOptions }
);
