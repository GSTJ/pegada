import { CopyObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { config } from "../shared/config";

/**
 * Legacy S3 client (shipped app binaries upload here via `image.signedUrl`).
 * Must keep behaving exactly as before the R2 migration — see the AWS block
 * in config.ts.
 */
export const client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
  // Dev/e2e: MinIO endpoint override. forcePathStyle because MinIO does
  // not serve virtual-hosted-style buckets (bucket.localhost:9002).
  ...(config.AWS_S3_ENDPOINT ? { endpoint: config.AWS_S3_ENDPOINT, forcePathStyle: true } : {}),
});

/**
 * New upload path: Cloudflare R2, served publicly via the bucket's custom
 * domain (PUBLIC_IMAGES_BASE_URL). Only active when fully configured —
 * otherwise `image.signedUpload` falls back to the legacy client above,
 * which keeps dev/e2e on MinIO with zero extra setup.
 */
export const r2UploadsEnabled = Boolean(
  config.R2_ENDPOINT &&
  config.R2_ACCESS_KEY_ID &&
  config.R2_SECRET_ACCESS_KEY &&
  config.PUBLIC_IMAGES_BASE_URL,
);

export const r2Client = r2UploadsEnabled
  ? new S3Client({
      // R2 convention: region is always "auto" (R2 ignores it, the SDK requires it).
      region: "auto",
      endpoint: config.R2_ENDPOINT,
      // R2 does not serve virtual-hosted-style buckets either.
      forcePathStyle: true,
      credentials: {
        // Non-null: guaranteed by the r2UploadsEnabled gate above.
        accessKeyId: config.R2_ACCESS_KEY_ID!,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
      },
    })
  : undefined;

/** Build the public URL an R2 object key is served from. */
export const getPublicUrl = (key: string) =>
  `${config.PUBLIC_IMAGES_BASE_URL}/${key.split("/").map(encodeURIComponent).join("/")}`;

const hostOf = (url: string) => new URL(url).host;

/**
 * Whether an image URL points at R2 — either the public custom domain
 * (what new clients store in the DB) or the raw R2 S3 API endpoint.
 * Everything else (amazonaws.com, MinIO) belongs to the legacy S3 client.
 */
const isR2Url = (url: string) => {
  if (!r2UploadsEnabled) return false;
  const host = hostOf(url);
  return (
    host === hostOf(config.PUBLIC_IMAGES_BASE_URL as string) ||
    host === hostOf(config.R2_ENDPOINT as string)
  );
};

/** Pick the storage (client + bucket) an image URL lives in, by host. */
const storageForUrl = (url: string) =>
  isR2Url(url)
    ? // Non-null: isR2Url only returns true when r2UploadsEnabled.
      { client: r2Client as S3Client, bucket: config.R2_BUCKET_NAME, isR2: true }
    : { client, bucket: config.AWS_S3_BUCKET_NAME, isR2: false };

/**
 * Extract the object key from an object URL, host-agnostically.
 * Handles virtual-hosted AWS URLs (bucket.s3.region.amazonaws.com/<key>),
 * path-style endpoints (MinIO/R2 API: host/<bucket>/<key>), and the R2
 * custom domain (images.pegada.app/<key>, no bucket segment).
 */
const keyFromUrl = (url: string, bucket: string) => {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const withoutBucket = segments[0] === bucket ? segments.slice(1) : segments;
  return decodeURIComponent(withoutBucket.join("/"));
};

export const deleteImageFromS3 = async (url: string) => {
  const { client: storageClient, bucket } = storageForUrl(url);

  // Full key, folder prefix included — the old `.split("/").slice(-1)`
  // dropped the "dogs-temporary/" prefix and silently deleted nothing.
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: keyFromUrl(url, bucket),
  });

  await storageClient.send(command);
};

// Move image to another folder in S3, receives the url of the image and the new folder name and returns the new url
export const moveImageToFolder = async (url: string, folder: string) => {
  // Routed by URL host: images uploaded through the legacy path live on
  // S3/MinIO, images from the new path live on R2. Copies never cross
  // providers — temp and permanent folders are in the same bucket.
  const { client: storageClient, bucket, isR2 } = storageForUrl(url);

  const oldKey = keyFromUrl(url, bucket);
  const fileName = oldKey.split("/").slice(-1)[0];
  const newKey = `${folder}/${fileName}`;

  const command = new CopyObjectCommand({
    Bucket: bucket,
    CopySource: `${bucket}/${encodeURIComponent(oldKey)}`,
    Key: newKey,
    // Legacy S3 objects are public per-object; R2 has no ACL concept
    // (public access is via the bucket's custom domain), so the param is
    // only sent on the legacy path.
    ...(isR2 ? {} : { ACL: "public-read" as const }),
  });

  await storageClient.send(command);

  await deleteImageFromS3(url);

  return url.replace(oldKey, newKey);
};
