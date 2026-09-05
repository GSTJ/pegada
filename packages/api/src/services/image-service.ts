import type { DogServerSchema } from "@pegada/shared/schemas/dog-schema";
import type { Image } from "@prisma/client";

import { randomUUID } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "@pegada/database";
import {
  InvalidUploadGrantError,
  UploadLimitReachedError,
} from "@pegada/shared/errors/errors";
import { addSeconds } from "date-fns/addSeconds";
import { subHours } from "date-fns/subHours";

import { enqueue } from "../queue/enqueue";
import { TOPICS } from "../queue/topics";
import { config } from "../shared/config";
import {
  client,
  deleteImageFromS3,
  getMovedImageUrl,
  getPublicUrl,
  moveImageToFolder,
  r2Client,
  r2UploadsEnabled,
  TEMPORARY_UPLOAD_PREFIX,
} from "../shared/file-upload";

const PERMANENT_STORAGE_FOLDER = "dogs";
export const UPLOAD_GRANT_LIMIT = 12;
export const UPLOAD_GRANT_WINDOW_SECONDS = 60 * 60;

/**
 * How long the presigned PUT stays signable. The app uploads the bytes the
 * moment the picker closes, so this window only has to cover one request that
 * is already in flight, and a short one keeps a leaked URL cheap.
 */
export const UPLOAD_URL_TTL_SECONDS = 10 * 60;

/**
 * How long the grant stays claimable, which is what `makeTemporaryImagesPermanent`
 * checks when the profile is finally saved.
 *
 * These two used to be one constant, and that is the bug in issue #282: Create
 * Profile is a single screen where the photos upload first and the name, the
 * bio and the gender are typed afterwards. Anyone who took more than ten
 * minutes over that form hit "This photo upload has expired" on save, and
 * every further tap resubmitted the same dead URLs out of form state, so the
 * profile could never be saved at all. The PUT window and the window a person
 * has to finish typing are unrelated, so they are now separate numbers.
 */
export const UPLOAD_GRANT_TTL_SECONDS = 60 * 60;

/**
 * Deleting the object has to wait for the grant, not for the signature: the
 * cleanup job bails out on a grant that has not expired yet, so a delay tied
 * to the PUT window would fire early, do nothing, and leave the object behind
 * forever.
 */
export const UPLOAD_CLEANUP_DELAY_SECONDS = UPLOAD_GRANT_TTL_SECONDS + 60;

export type SignedUploadInput = {
  contentLength?: number;
  contentType?: "image/webp";
};

export const createTemporaryUploadKey = () =>
  `${TEMPORARY_UPLOAD_PREFIX}/${randomUUID()}`;

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
  static async #recordUploadGrant(userId: string, temporaryUrl: string) {
    const grant = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`upload-grant:${userId}`}, 0)
        )::text
      `;

      const recentGrants = await tx.uploadGrant.count({
        where: {
          userId,
          createdAt: { gte: subHours(new Date(), 1) },
        },
      });

      if (recentGrants >= UPLOAD_GRANT_LIMIT) {
        throw new UploadLimitReachedError();
      }

      return tx.uploadGrant.create({
        data: {
          userId,
          temporaryUrl,
          expiresAt: addSeconds(new Date(), UPLOAD_GRANT_TTL_SECONDS),
        },
        select: { id: true },
      });
    });

    try {
      await enqueue(
        TOPICS.CLEANUP_UPLOAD,
        { grantId: grant.id, phase: "object" },
        {
          delaySeconds: UPLOAD_CLEANUP_DELAY_SECONDS,
          idempotencyKey: `upload-cleanup:${grant.id}`,
        },
      );
    } catch (error) {
      await prisma.uploadGrant.deleteMany({ where: { id: grant.id } });
      throw error;
    }
  }

  /**
   * LEGACY path — shipped app binaries call this and derive the public URL
   * by stripping the presigned URL's query string, so the response shape
   * AND the presigned host (S3) must stay exactly as they are. Remove once
   * MIN_APP_VERSION is past the release that switched to `signedUpload`.
   */
  static async getSignedUrl(userId: string) {
    const key = createTemporaryUploadKey();

    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ACL: "public-read",
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });

    await this.#recordUploadGrant(userId, url.split("?")[0] as string);

    return { url };
  }

  /**
   * NEW path — returns a `SignedUpload` descriptor (see type above). This
   * function is the single place vendor selection lives: R2 when configured,
   * legacy S3/MinIO otherwise (dev/e2e), and any future storage backend
   * just builds its own descriptor here.
   */
  static async getSignedUpload(
    userId: string,
    input: SignedUploadInput = {},
  ): Promise<SignedUpload> {
    const key = createTemporaryUploadKey();
    const contentType = input.contentType ?? "image/webp";
    const headers = {
      "Content-Type": contentType,
      ...(input.contentLength
        ? { "Content-Length": String(input.contentLength) }
        : {}),
    };

    if (r2UploadsEnabled) {
      const command = new PutObjectCommand({
        Bucket: config.R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ...(input.contentLength ? { ContentLength: input.contentLength } : {}),
        // No ACL: R2 has no ACL concept — public access is via the
        // bucket's custom domain (PUBLIC_IMAGES_BASE_URL).
      });

      const url = await getSignedUrl(
        // Non-null: guaranteed by the r2UploadsEnabled gate.
        r2Client as NonNullable<typeof r2Client>,
        command,
        { expiresIn: UPLOAD_URL_TTL_SECONDS },
      );

      const publicUrl = getPublicUrl(key);
      await this.#recordUploadGrant(userId, publicUrl);

      return { method: "PUT", url, headers, publicUrl };
    }

    // R2 not configured (dev/e2e): presign against the legacy S3/MinIO
    // client. The public URL is the presigned URL minus its auth query
    // string — same address old clients derive, so local behavior matches.
    const command = new PutObjectCommand({
      Bucket: config.AWS_S3_BUCKET_NAME,
      Key: key,
      ACL: "public-read",
      ContentType: contentType,
      ...(input.contentLength ? { ContentLength: input.contentLength } : {}),
    });

    const url = await getSignedUrl(client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
    const publicUrl = url.split("?")[0] as string;
    await this.#recordUploadGrant(userId, publicUrl);

    return {
      method: "PUT",
      url,
      headers,
      publicUrl,
    };
  }

  static getImageById(id: string) {
    return prisma.image.findUnique({
      where: { id },
    });
  }

  /**
   * The verdict already on an image, if there is one.
   *
   * Read before the image job calls a provider so a redelivered job reuses what
   * was already paid for.
   */
  static getStoredModerationVerdict(id: string) {
    return prisma.image.findUnique({
      where: { id },
      select: { moderationVerdict: true },
    });
  }

  /**
   * The dog and the person behind one image, for the image job.
   *
   * The job payload carries the image row as it was enqueued and nothing about
   * who owns it, and both things that happen after a verdict need the owner:
   * the analytics event is attributed to them, and the rejection push goes to
   * their device.
   */
  static getImageOwner(id: string) {
    return prisma.image.findUnique({
      where: { id },
      select: {
        dogId: true,
        dog: {
          select: {
            name: true,
            user: { select: { id: true, pushToken: true } },
          },
        },
      },
    });
  }

  static updateImage({ id, ...data }: Partial<Image> & { id: string }) {
    return prisma.image.update({
      where: { id },
      data,
    });
  }

  /**
   * Move new images to another s3 folder that won't expire.
   */
  static makeTemporaryImagesPermanent = (
    images: DogServerSchema["images"],
    userId: string,
  ) => {
    const permanentImages = images.map(async (image) => {
      const permanentUrl = getMovedImageUrl(
        image.url,
        PERMANENT_STORAGE_FOLDER,
      );
      const claim = await prisma.uploadGrant.updateMany({
        where: {
          userId,
          temporaryUrl: image.url,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          consumedAt: new Date(),
          permanentUrl,
        },
      });

      if (claim.count !== 1) throw new InvalidUploadGrantError();

      const url = await moveImageToFolder(image.url, PERMANENT_STORAGE_FOLDER);
      if (url !== permanentUrl) throw new InvalidUploadGrantError();
      return { ...image, url };
    });

    return Promise.all(permanentImages);
  };

  static async cleanupUploadGrant(grantId: string) {
    const grant = await prisma.uploadGrant.findUnique({
      where: { id: grantId },
    });
    if (!grant) return;

    const permanentImageInUse = grant.permanentUrl
      ? await prisma.image.count({ where: { url: grant.permanentUrl } })
      : 0;
    const urls = new Set([
      grant.temporaryUrl,
      ...(grant.permanentUrl && permanentImageInUse === 0
        ? [grant.permanentUrl]
        : []),
    ]);

    await Promise.all([...urls].map((url) => deleteImageFromS3(url)));
    await prisma.uploadGrant.update({
      where: { id: grant.id },
      data: { cleanedAt: new Date() },
    });
  }

  static async cleanupExpiredTemporaryUpload(grantId: string) {
    const grant = await prisma.uploadGrant.findFirst({
      where: {
        id: grantId,
        consumedAt: null,
        expiresAt: { lte: new Date() },
      },
    });
    if (!grant) return;

    await deleteImageFromS3(grant.temporaryUrl);
    await prisma.uploadGrant.updateMany({
      where: {
        id: grant.id,
        consumedAt: null,
        expiresAt: { lte: new Date() },
      },
      data: { cleanedAt: new Date() },
    });
  }

  static pruneUploadGrant(grantId: string) {
    return prisma.uploadGrant.deleteMany({ where: { id: grantId } });
  }
}
