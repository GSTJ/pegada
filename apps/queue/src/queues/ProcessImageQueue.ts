import { Worker } from "bullmq";

import { redisConnection } from "@pegada/api/constants/redis";
import { sendError } from "@pegada/api/errors/errors";
import {
  IProcessImageJobData,
  PROCESS_IMAGE_QUEUE
} from "@pegada/api/queue/ProcessImageQueue";
import { ImageService } from "@pegada/api/services/ImageService";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { ImageProcessingService } from "../services/ImageProcessingService";

export const worker = new Worker<IProcessImageJobData>(
  PROCESS_IMAGE_QUEUE,
  async ({ data: image }) => {
    try {
      const arrayBuffer = await fetch(image.url).then((res) =>
        res.arrayBuffer()
      );

      const status = await ImageProcessingService.checkForProfanity({
        arrayBuffer
      });

      let blurhash: string | undefined;

      // Blurhashes for blocked images are not needed
      if (status === IMAGE_STATUS.APPROVED) {
        //  It's OK if this fails, we should still save the image.
        try {
          blurhash = await ImageProcessingService.createBlurhash({
            arrayBuffer
          });
        } catch (error) {
          sendError(error);
        }
      }

      return ImageService.updateImage({
        ...image,
        blurhash,
        status
      });
    } catch (error) {
      sendError(error);
      throw error;
    }
  },
  { connection: redisConnection, concurrency: 1 }
);
