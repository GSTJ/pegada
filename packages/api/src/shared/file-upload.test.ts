jest.mock("@aws-sdk/client-s3", () => {
  const send = jest.fn().mockResolvedValue({});

  return {
    send,
    S3Client: jest.fn(() => ({ send })),
    CopyObjectCommand: jest.fn((input: unknown) => ({ type: "copy", input })),
    DeleteObjectCommand: jest.fn((input: unknown) => ({ type: "delete", input })),
  };
});

import { CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { config } from "./config";
import { deleteImageFromS3, moveImageToFolder } from "./file-upload";

const { send } = jest.requireMock("@aws-sdk/client-s3") as { send: jest.Mock };

/**
 * .env.test leaves R2 and AWS_S3_ENDPOINT unset, so the only allowed origin
 * is the legacy virtual-hosted bucket.
 */
const BUCKET_URL = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue({});
});

describe("moveImageToFolder", () => {
  it("copies the object and deletes the original", async () => {
    await moveImageToFolder(`${BUCKET_URL}/dogs-temporary/1712345678`, "dogs");

    expect(CopyObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: config.AWS_S3_BUCKET_NAME,
        CopySource: `${config.AWS_S3_BUCKET_NAME}/${encodeURIComponent("dogs-temporary/1712345678")}`,
        Key: "dogs/1712345678",
      }),
    );

    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: config.AWS_S3_BUCKET_NAME,
        Key: "dogs-temporary/1712345678",
      }),
    );
  });

  it("returns a URL rebuilt from the storage base", async () => {
    const url = await moveImageToFolder(`${BUCKET_URL}/dogs-temporary/1712345678`, "dogs");

    expect(url).toBe(`${BUCKET_URL}/dogs/1712345678`);
  });

  it("refuses a URL on a host we do not serve images from", async () => {
    await expect(
      moveImageToFolder("https://example.com/dogs-temporary/1712345678", "dogs"),
    ).rejects.toThrow("configured storage origin");

    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a host that only contains the bucket host as a substring", async () => {
    await expect(
      moveImageToFolder(
        `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com.example.com/dogs-temporary/1`,
        "dogs",
      ),
    ).rejects.toThrow("configured storage origin");

    expect(send).not.toHaveBeenCalled();
  });

  it("refuses loopback and link-local addresses", async () => {
    await expect(moveImageToFolder("http://127.0.0.1:9002/x/y", "dogs")).rejects.toThrow(
      "configured storage origin",
    );

    await expect(
      moveImageToFolder("http://169.254.169.254/latest/meta-data/", "dogs"),
    ).rejects.toThrow("configured storage origin");

    expect(send).not.toHaveBeenCalled();
  });

  /**
   * The URL comes off the dog payload, so the caller picks the key. Only a
   * pending upload is a valid thing to move.
   */
  it("refuses a key already under the permanent folder", async () => {
    await expect(moveImageToFolder(`${BUCKET_URL}/dogs/1712345678`, "dogs")).rejects.toThrow(
      "temporary upload",
    );

    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a key under any other prefix", async () => {
    await expect(moveImageToFolder(`${BUCKET_URL}/backups/1712345678`, "dogs")).rejects.toThrow(
      "temporary upload",
    );

    await expect(moveImageToFolder(`${BUCKET_URL}/1712345678`, "dogs")).rejects.toThrow(
      "temporary upload",
    );

    await expect(
      moveImageToFolder(`${BUCKET_URL}/dogs-temporary-other/1712345678`, "dogs"),
    ).rejects.toThrow("temporary upload");

    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a key nested deeper than one segment under the temporary folder", async () => {
    await expect(
      moveImageToFolder(`${BUCKET_URL}/dogs-temporary/nested/1712345678`, "dogs"),
    ).rejects.toThrow("temporary upload");

    expect(send).not.toHaveBeenCalled();
  });

  it("does not delete the original when the copy fails", async () => {
    send.mockRejectedValueOnce(new Error("copy blew up"));

    await expect(
      moveImageToFolder(`${BUCKET_URL}/dogs-temporary/1712345678`, "dogs"),
    ).rejects.toThrow("copy blew up");

    expect(CopyObjectCommand).toHaveBeenCalled();
    expect(DeleteObjectCommand).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("deleteImageFromS3", () => {
  it("deletes the full key, folder prefix included", async () => {
    await deleteImageFromS3(`${BUCKET_URL}/dogs/1712345678`);

    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "dogs/1712345678" }),
    );
  });

  it("refuses a URL on a host we do not serve images from", async () => {
    await expect(deleteImageFromS3("https://example.com/dogs/1712345678")).rejects.toThrow(
      "configured storage origin",
    );

    expect(send).not.toHaveBeenCalled();
  });
});
