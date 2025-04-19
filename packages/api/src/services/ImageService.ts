import { PutObjectCommand } from "@aws-sdk/client-s3";
import * as RequestPresigner from "@aws-sdk/s3-request-presigner";
import { Image } from "@prisma/client";

import prisma from "@pegada/database";
import { DogServerSchema } from "@pegada/shared/schemas/dogSchema";

import { config } from "../shared/config";
import * as FileUpload from "../shared/fileUpload";
import { moveImageToFolder } from "../shared/fileUpload";

const PERMANENT_STORAGE_FOLDER = "dogs";

export class ImageService {
  static async getSignedUrl() {
    const key = "dogs-temporary/" + Date.now().toString();

    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ACL: "public-read"
    });

    const url = await RequestPresigner.getSignedUrl(
      FileUpload.client,
      command,
      { expiresIn: 60 * 60 }
    );

    return { url };
  }

  static async getImageById(id: string) {
    return prisma.image.findUnique({
      where: { id: id }
    });
  }

  static async updateImage({ id, ...data }: Partial<Image> & { id: string }) {
    return prisma.image.update({
      where: { id: id },
      data
    });
  }

  /**
   * Move new images to another s3 folder that won't expire.
   */
  static makeTemporaryImagesPermanent = (images: DogServerSchema["images"]) => {
    const permanentImages = images.map(async (image) => {
      const url = await moveImageToFolder(image.url, PERMANENT_STORAGE_FOLDER);
      return { ...image, url };
    });

    return Promise.all(permanentImages);
  };
}
