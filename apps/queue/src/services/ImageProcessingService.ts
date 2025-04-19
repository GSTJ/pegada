import * as tf from "@tensorflow/tfjs-node";
import * as Blurhash from "blurhash";
import * as nsfwjs from "nsfwjs";
import sharp from "sharp";

import { FEATURES, FlagService } from "@pegada/api/services/FlagService";
import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

export class ImageProcessingService {
  static checkForProfanity = async ({
    arrayBuffer,
    threshold = 0.7
  }: {
    arrayBuffer: ArrayBuffer;
    threshold?: number;
  }) => {
    const isProfanityCheckEnabled = await FlagService.isFeatureEnabled({
      feature: FEATURES.PROFANITY_CHECK,
      defaultValue: false
    });

    // In case this isn't working as intended or consuming too much bandwidth
    if (!isProfanityCheckEnabled) {
      return IMAGE_STATUS.APPROVED;
    }

    const imageBuffer = await sharp(arrayBuffer)
      .resize({ height: 300, withoutEnlargement: true })
      .toBuffer();

    const imageTensor = tf.tidy(() => {
      return tf.node.decodeImage(imageBuffer, 3);
    }) as unknown as tf.Tensor3D;

    const model = await nsfwjs.load("MobileNetV2");
    const predictions = await model.classify(imageTensor);

    const isNotSafe = predictions.some(
      (prediction) =>
        prediction.className !== "Neutral" && prediction.probability > threshold
    );

    return isNotSafe ? IMAGE_STATUS.REJECTED : IMAGE_STATUS.APPROVED;
  };

  static async createBlurhash({ arrayBuffer }: { arrayBuffer: ArrayBuffer }) {
    const isBlurhashEnabled = await FlagService.isFeatureEnabled({
      feature: FEATURES.IMAGE_BLURHASH,
      defaultValue: true
    });

    // In case this isn't working as intended or consuming too much bandwidth
    if (!isBlurhashEnabled) {
      return undefined;
    }

    const { data: pixels, info: metadata } = await sharp(arrayBuffer)
      .resize({ height: 100, withoutEnlargement: true })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });

    const clamped = new Uint8ClampedArray(pixels);

    const blurhash = Blurhash.encode(
      clamped,
      metadata.width,
      metadata.height,
      4,
      4
    );

    return blurhash;
  }
}
