import { CopyObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { config } from "../shared/config";
import { assertAllowedImageUrl } from "./image-url";

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

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/** Build the public URL an R2 object key is served from. */
export const getPublicUrl = (key: string) => `${config.PUBLIC_IMAGES_BASE_URL}/${encodeKey(key)}`;

/**
 * Build the URL a legacy S3/MinIO object key is served from. Mirrors what
 * `getSignedUpload` hands the client on that path: the endpoint override is
 * path-style (`<endpoint>/<bucket>/<key>`, MinIO in dev/e2e), plain AWS is
 * virtual-hosted (`<bucket>.s3.<region>.amazonaws.com/<key>`).
 */
export const getLegacyUrl = (key: string) => {
  const base = config.AWS_S3_ENDPOINT
    ? `${config.AWS_S3_ENDPOINT.replace(/\/+$/, "")}/${config.AWS_S3_BUCKET_NAME}`
    : `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;

  return `${base}/${encodeKey(key)}`;
};

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

type Storage = {
  client: S3Client;
  bucket: string;
  isR2: boolean;
  /** Canonical public URL for a key in this storage. */
  urlForKey: (key: string) => string;
};

/**
 * Pick the storage (client + bucket) an image URL lives in, by host.
 *
 * Fails closed: the legacy S3 client used to be the fallback for every host
 * that wasn't R2, which meant a URL pointing anywhere at all still got
 * operated on. Only the configured storage origins get past this now.
 */
const storageForUrl = (url: string): Storage => {
  assertAllowedImageUrl(url);

  if (isR2Url(url)) {
    // Non-null: isR2Url only returns true when r2UploadsEnabled.
    return {
      client: r2Client as S3Client,
      bucket: config.R2_BUCKET_NAME,
      isR2: true,
      urlForKey: getPublicUrl,
    };
  }

  return {
    client,
    bucket: config.AWS_S3_BUCKET_NAME,
    isR2: false,
    urlForKey: getLegacyUrl,
  };
};

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

/**
 * Where every fresh upload lands. Both upload routes (`image.signedUpload` and
 * the legacy `image.signedUrl`) presign exactly one key shape,
 * `dogs-temporary/<timestamp>`, so a freshly uploaded object is always here
 * and never anywhere else.
 */
export const TEMPORARY_UPLOAD_PREFIX = "dogs-temporary";

/**
 * The move acts on a key the caller names: the URL comes straight off the dog
 * create/update payload. An allowed origin only tells us the key is somewhere
 * in our storage, and the move is meant for one thing, a pending upload. So it
 * accepts a key directly under the temporary prefix, one segment, nothing else.
 */
const assertTemporaryUploadKey = (key: string) => {
  const [prefix, name, ...rest] = key.split("/");

  if (prefix !== TEMPORARY_UPLOAD_PREFIX || !name || rest.length > 0) {
    throw new Error("Image URL does not point at a temporary upload");
  }
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
  const { client: storageClient, bucket, isR2, urlForKey } = storageForUrl(url);

  const oldKey = keyFromUrl(url, bucket);

  // Ahead of the copy and the delete below, both of which act on this key.
  assertTemporaryUploadKey(oldKey);

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

  // Sequential on purpose: a failed copy rejects here and the original stays
  // put. Losing the object because only half the move ran is worse than the
  // move failing.
  await storageClient.send(command);

  await deleteImageFromS3(url);

  // Rebuilt from the storage's own base URL rather than patched out of the
  // caller's string, so nothing about the incoming URL other than the file
  // name reaches the database.
  return urlForKey(newKey);
};
