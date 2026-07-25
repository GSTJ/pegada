import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { sendError } from "../../errors/errors";
import { ImageProcessingService } from "../../services/ImageProcessingService";
import { ImageService } from "../../services/ImageService";
import { assertAllowedImageUrl } from "../../shared/imageUrl";
import { IProcessImageJobData } from "../topics";

export const handleProcessImage = async (image: IProcessImageJobData) => {
  // The URL is validated on the way in and rebuilt from our own storage base
  // before it is persisted, so this should never fire. It is here because the
  // job is the one place the server makes an outbound request with a URL that
  // started life in a request body.
  assertAllowedImageUrl(image.url);

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
