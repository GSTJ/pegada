import * as Blurhash from "blurhash";
import sharp from "sharp";

import { IMAGE_STATUS } from "@pegada/shared/schemas/dogSchema";

import { FEATURES, FlagService } from "./FlagService";

export class ImageProcessingService {
  static checkForProfanity = async ({
    arrayBuffer,
    threshold = 0.7,
  }: {
    arrayBuffer: ArrayBuffer;
    threshold?: number;
  }) => {
    const isProfanityCheckEnabled = await FlagService.isFeatureEnabled({
      feature: FEATURES.PROFANITY_CHECK,
      defaultValue: false,
    });

    // In case this isn't working as intended or consuming too much bandwidth
    if (!isProfanityCheckEnabled) {
      return IMAGE_STATUS.APPROVED;
    }

    // Pure-JS tfjs instead of tfjs-node: the consumer runs in a Vercel
    // function where native bindings can't load. Lazy imports keep the
    // model out of every other route's cold start.
    const [tf, nsfwjs] = await Promise.all([import("@tensorflow/tfjs"), import("nsfwjs")]);

    const { data, info } = await sharp(arrayBuffer)
      .resize({ height: 300, withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imageTensor = tf.tensor3d(new Int32Array(data), [info.height, info.width, 3], "int32");

    try {
      const model = await nsfwjs.load("MobileNetV2");
      const predictions = await model.classify(imageTensor as never);

      const isNotSafe = predictions.some(
        (prediction) => prediction.className !== "Neutral" && prediction.probability > threshold,
      );

      return isNotSafe ? IMAGE_STATUS.REJECTED : IMAGE_STATUS.APPROVED;
    } finally {
      imageTensor.dispose();
    }
  };

  static async createBlurhash({ arrayBuffer }: { arrayBuffer: ArrayBuffer }) {
    const isBlurhashEnabled = await FlagService.isFeatureEnabled({
      feature: FEATURES.IMAGE_BLURHASH,
      defaultValue: true,
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

    return Blurhash.encode(clamped, metadata.width, metadata.height, 4, 4);
  }
}
