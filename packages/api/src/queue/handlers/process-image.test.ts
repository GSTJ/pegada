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

import { ImageService } from "../../services/image-service";
import { config } from "../../shared/config";
import { handleProcessImage } from "./process-image";

const BUCKET_URL = `https://${config.AWS_S3_BUCKET_NAME}.s3.${config.AWS_REGION}.amazonaws.com`;

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("handleProcessImage", () => {
  it("downloads an image served from the configured bucket", async () => {
    await handleProcessImage({
      id: "image-id",
      url: `${BUCKET_URL}/dogs/1712345678`,
    });

    expect(fetchMock).toHaveBeenCalledWith(`${BUCKET_URL}/dogs/1712345678`);
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
});
