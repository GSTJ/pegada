import { config } from "./config";

/**
 * The storage origins image URLs are allowed to point at.
 *
 * Image URLs arrive from the client (dog create/update) and the server then
 * copies, deletes and downloads them, so anything not pinned to our own
 * storage is a request the server makes on a caller's behalf. Everything is
 * matched on the parsed `URL.origin`: scheme, host and port together, exact
 * equality. Substring or prefix matching would accept
 * `https://images.pegada.app.example.com/x`, and a host-only match would
 * accept an arbitrary port on our own domain.
 */
export type ImageStorageConfig = {
  /** R2 bucket custom domain, e.g. https://images.pegada.app */
  publicImagesBaseUrl?: string;
  /** R2 S3 API endpoint, e.g. https://<account>.r2.cloudflarestorage.com */
  r2Endpoint?: string;
  /** Legacy S3 endpoint override (MinIO in dev/e2e). Unset in production. */
  awsS3Endpoint?: string;
  awsBucketName: string;
  awsRegion: string;
};

const originOf = (url: string | undefined) => {
  if (!url) return undefined;

  try {
    const { origin, protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") return undefined;
    return origin.toLowerCase();
  } catch {
    return undefined;
  }
};

/**
 * The legacy S3 client presigns virtual-hosted-style URLs, so objects are
 * served from `<bucket>.s3.<region>.amazonaws.com`. The regionless form is
 * accepted too because buckets created before the regional endpoints existed
 * still answer there. Both are bucket-scoped, so neither widens the allowlist
 * past our own bucket.
 */
const awsOrigins = (bucket: string, region: string) => [
  `https://${bucket}.s3.${region}.amazonaws.com`.toLowerCase(),
  `https://${bucket}.s3.amazonaws.com`.toLowerCase(),
];

export const buildAllowedImageOrigins = (storage: ImageStorageConfig) => {
  const origins = [
    originOf(storage.publicImagesBaseUrl),
    originOf(storage.r2Endpoint),
    originOf(storage.awsS3Endpoint),
    ...awsOrigins(storage.awsBucketName, storage.awsRegion),
  ];

  return new Set(origins.filter((origin): origin is string => Boolean(origin)));
};

/**
 * Built from the running config. R2 values are optional (unset in dev/e2e)
 * and simply drop out of the set instead of widening it.
 */
export const allowedImageOrigins = () =>
  buildAllowedImageOrigins({
    publicImagesBaseUrl: config.PUBLIC_IMAGES_BASE_URL,
    r2Endpoint: config.R2_ENDPOINT,
    awsS3Endpoint: config.AWS_S3_ENDPOINT,
    awsBucketName: config.AWS_S3_BUCKET_NAME,
    awsRegion: config.AWS_REGION,
  });

export const isAllowedImageUrl = (url: string, origins = allowedImageOrigins()) => {
  const origin = originOf(url);
  return Boolean(origin && origins.has(origin));
};

export const assertAllowedImageUrl = (url: string, origins = allowedImageOrigins()) => {
  if (isAllowedImageUrl(url, origins)) return;

  throw new Error("Image URL does not point at a configured storage origin");
};
