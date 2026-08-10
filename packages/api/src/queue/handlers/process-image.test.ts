jest.mock("../../services/image-processing-service", () => ({
  ImageProcessingService: {
    checkForProfanity: jest.fn().mockResolvedValue("APPROVED"),
    createBlurhash: jest.fn().mockResolvedValue("blur"),
  },
}));

jest.mock("../../services/image-service", () => ({
  ImageService: { updateImage: jest.fn().mockResolvedValue({}) },
}));

jest.mock("../../errors/errors", () => ({ sendError: jest.fn() }));

import { ReadableStream } from "node:stream/web";

import { ImageService } from "../../services/image-service";
import { config } from "../../shared/config";
import {
  downloadImage,
  handleProcessImage,
  MAX_IMAGE_BYTES,
} from "./process-image";

const BUCKET_URL = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue(new Response(new Uint8Array(8)));
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("handleProcessImage", () => {
  it("downloads an image served from the configured bucket", async () => {
    await handleProcessImage({
      id: "image-id",
      url: `${BUCKET_URL}/dogs/1712345678`,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BUCKET_URL}/dogs/1712345678`, {
      redirect: "manual",
    });
    expect(ImageService.updateImage).toHaveBeenCalled();
  });

  it("does not fetch a URL on a host we do not serve images from", async () => {
    await expect(
      handleProcessImage({
        id: "image-id",
        url: "http://169.254.169.254/latest/meta-data/",
      }),
    ).rejects.toThrow("configured storage origin");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(ImageService.updateImage).not.toHaveBeenCalled();
  });

  it("rejects a declared image larger than the processing limit", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(new Uint8Array(0), {
        headers: { "content-length": String(MAX_IMAGE_BYTES + 1) },
      }),
    );

    await expect(downloadImage(`${BUCKET_URL}/dogs/large`)).rejects.toThrow(
      "10 MB processing limit",
    );
  });

  it("stops a chunked image once it crosses the processing limit", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_IMAGE_BYTES));
        controller.enqueue(new Uint8Array(1));
        controller.close();
      },
    });
    const response = new Response(body as never);
    fetchMock.mockResolvedValueOnce(response);

    await expect(downloadImage(`${BUCKET_URL}/dogs/chunked`)).rejects.toThrow(
      "10 MB processing limit",
    );
  });

  it("rejects a redirect outside the configured storage origins", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );

    await expect(downloadImage(`${BUCKET_URL}/dogs/redirect`)).rejects.toThrow(
      "configured storage origin",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a redirect that stays on the configured storage origin", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "/dogs/redirected" },
        }),
      )
      .mockResolvedValueOnce(new Response(new Uint8Array(8)));

    const body = await downloadImage(`${BUCKET_URL}/dogs/original`);
    expect(body.byteLength).toBe(8);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${BUCKET_URL}/dogs/redirected`,
      { redirect: "manual" },
    );
  });
});
