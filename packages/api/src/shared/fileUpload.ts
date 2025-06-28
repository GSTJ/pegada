import {
  CopyObjectCommand,
  DeleteObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import { config } from "../shared/config";

export const client = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY
  }
});

export const deleteImageFromS3 = async (url: string) => {
  const key = url.split("/").slice(-1)[0];

  const command = new DeleteObjectCommand({
    Bucket: config.AWS_S3_BUCKET_NAME,
    Key: key
  });

  await client.send(command);
};

// Move image to another folder in S3, receives the url of the image and the new folder name and returns the new url
export const moveImageToFolder = async (url: string, folder: string) => {
  const AWS_URL_END = "amazonaws.com/";

  const [awsUrlStart, oldKey] = url.split(AWS_URL_END) as [string, string];
  const newKey = `${folder}/${oldKey.split("/")[1]}`;

  const command = new CopyObjectCommand({
    Bucket: config.AWS_S3_BUCKET_NAME,
    CopySource: `${config.AWS_S3_BUCKET_NAME}/${oldKey}`,
    Key: newKey,
    ACL: "public-read"
  });

  await client.send(command);

  await deleteImageFromS3(url);

  return `${awsUrlStart}${AWS_URL_END}${newKey}`;
};
