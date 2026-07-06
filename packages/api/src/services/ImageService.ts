import { PutObjectCommand } from "@aws-sdk/client-s3";
import * as RequestPresigner from "@aws-sdk/s3-request-presigner";
import { Image } from "@prisma/client";

import prisma from "@pegada/database";
import { DogServerSchema } from "@pegada/shared/schemas/dogSchema";

import { config } from "../shared/config";
import * as FileUpload from "../shared/fileUpload";
import { getPublicUrl, moveImageToFolder } from "../shared/fileUpload";

const PERMANENT_STORAGE_FOLDER = "dogs";

/**
 * Storage-agnostic upload descriptor returned by `image.signedUpload`.
 *
 * The contract: the client performs the upload exactly as described
 * (method + url + headers), then stores/displays ONLY `publicUrl` — no
 * deriving URLs from the upload target, no assumptions about hosts,
 * buckets, or query strings. That keeps vendor choice a server-side
 * config decision: swapping R2 for GCS, Azure, or anything else just
 * returns a different descriptor, shipped clients never change.
 */
export type SignedUpload = {
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  publicUrl: string;
};

export class ImageService {
  /**
   * LEGACY path — shipped app binaries call this and derive the public URL
   * by stripping the presigned URL's query string, so the response shape
   * AND the presigned host (S3) must stay exactly as they are. Remove once
   * MIN_APP_VERSION is past the release that switched to `signedUpload`.
   */
  static async getSignedUrl() {
    const key = "dogs-temporary/" + Date.now().toString();

    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ACL: "public-read",
    });

    const url = await RequestPresigner.getSignedUrl(FileUpload.client, command, {
      expiresIn: 60 * 60,
    });

    return { url };
  }

  /**
   * NEW path — returns a `SignedUpload` descriptor (see type above). This
   * function is the single place vendor selection lives: R2 when configured,
   * legacy S3/MinIO otherwise (dev/e2e), and any future storage backend
   * just builds its own descriptor here.
   */
  static async getSignedUpload(): Promise<SignedUpload> {
    const key = "dogs-temporary/" + Date.now().toString();

    if (FileUpload.r2UploadsEnabled) {
      const command = new PutObjectCommand({
        Bucket: config.R2_BUCKET_NAME,
        Key: key,
        // No ACL: R2 has no ACL concept — public access is via the
        // bucket's custom domain (PUBLIC_IMAGES_BASE_URL).
      });

      const url = await RequestPresigner.getSignedUrl(
        // Non-null: guaranteed by the r2UploadsEnabled gate.
        FileUpload.r2Client as NonNullable<typeof FileUpload.r2Client>,
        command,
        { expiresIn: 60 * 60 },
      );

      return { method: "PUT", url, headers: {}, publicUrl: getPublicUrl(key) };
    }

    // R2 not configured (dev/e2e): presign against the legacy S3/MinIO
    // client. The public URL is the presigned URL minus its auth query
    // string — same address old clients derive, so local behavior matches.
    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ACL: "public-read",
    });

    const url = await RequestPresigner.getSignedUrl(FileUpload.client, command, {
      expiresIn: 60 * 60,
    });

    return { method: "PUT", url, headers: {}, publicUrl: url.split("?")[0] as string };
  }

  static async getImageById(id: string) {
    return prisma.image.findUnique({
      where: { id: id },
    });
  }

  static async updateImage({ id, ...data }: Partial<Image> & { id: string }) {
    return prisma.image.update({
      where: { id: id },
      data,
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
