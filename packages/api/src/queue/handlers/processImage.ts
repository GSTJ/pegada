import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { sendError } from "../../errors/errors";
import { ImageProcessingService } from "../../services/ImageProcessingService";
import { ImageService } from "../../services/ImageService";
import { IProcessImageJobData } from "../topics";

export const handleProcessImage = async (image: IProcessImageJobData) => {
  const arrayBuffer = await fetch(image.url).then((res) => res.arrayBuffer());

  const status = await ImageProcessingService.checkForProfanity({
    arrayBuffer,
  });

  let blurhash: string | undefined;

  // Blurhashes for rejected images are not needed
  if (status === IMAGE_STATUS.APPROVED) {
    // It's OK if this fails, we should still save the image.
    try {
      blurhash = await ImageProcessingService.createBlurhash({
        arrayBuffer,
      });
    } catch (error) {
      sendError(error);
    }
  }

  return ImageService.updateImage({
    ...image,
    blurhash,
    status,
  });
};
