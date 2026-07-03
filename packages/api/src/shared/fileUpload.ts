import { CopyObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { config } from "../shared/config";

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
 * Extract the object key from an S3 object URL, host-agnostically.
 * Handles both virtual-hosted AWS URLs (bucket.s3.region.amazonaws.com/<key>)
 * and path-style endpoints (MinIO/dev: host/<bucket>/<key>).
 */
const keyFromUrl = (url: string) => {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const withoutBucket = segments[0] === config.AWS_S3_BUCKET_NAME ? segments.slice(1) : segments;
  return decodeURIComponent(withoutBucket.join("/"));
};

export const deleteImageFromS3 = async (url: string) => {
  // Full key, folder prefix included — the old `.split("/").slice(-1)`
  // dropped the "dogs-temporary/" prefix and silently deleted nothing.
  const command = new DeleteObjectCommand({
    Bucket: config.AWS_S3_BUCKET_NAME,
    Key: keyFromUrl(url),
  });

  await client.send(command);
};

// Move image to another folder in S3, receives the url of the image and the new folder name and returns the new url
export const moveImageToFolder = async (url: string, folder: string) => {
  // Host-agnostic: the previous implementation split on a hardcoded
  // "amazonaws.com/", which threw on any other endpoint (MinIO in dev/e2e)
  // and broke profile creation end-to-end.
  const oldKey = keyFromUrl(url);
  const fileName = oldKey.split("/").slice(-1)[0];
  const newKey = `${folder}/${fileName}`;

  const command = new CopyObjectCommand({
    Bucket: config.AWS_S3_BUCKET_NAME,
    CopySource: `${config.AWS_S3_BUCKET_NAME}/${encodeURIComponent(oldKey)}`,
    Key: newKey,
    ACL: "public-read",
  });

  await client.send(command);

  await deleteImageFromS3(url);

  return url.replace(oldKey, newKey);
};
