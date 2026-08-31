import { ImageService } from "../../services/image-service";
import { enqueue } from "../enqueue";
import { TOPICS } from "../topics";
import { handleCleanupUpload } from "./upload";

jest.mock("../../services/image-service", () => ({
  ImageService: {
    cleanupUploadGrant: jest.fn(async () => undefined),
    cleanupExpiredTemporaryUpload: jest.fn(async () => undefined),
    pruneUploadGrant: jest.fn(async () => undefined),
  },
  UPLOAD_GRANT_WINDOW_SECONDS: 3600,
}));

jest.mock("../enqueue", () => ({
  enqueue: jest.fn(async () => undefined),
}));

const cleanupUploadGrant = jest.mocked(ImageService.cleanupUploadGrant);
const cleanupExpiredTemporaryUpload = jest.mocked(
  ImageService.cleanupExpiredTemporaryUpload,
);
const pruneUploadGrant = jest.mocked(ImageService.pruneUploadGrant);
const enqueueJob = jest.mocked(enqueue);

it("deletes stale objects before scheduling grant pruning", async () => {
  await handleCleanupUpload({ grantId: "grant-1", phase: "object" });

  expect(cleanupExpiredTemporaryUpload).toHaveBeenCalledWith("grant-1");
  expect(cleanupUploadGrant).not.toHaveBeenCalled();
  expect(enqueueJob).toHaveBeenCalledWith(
    TOPICS.CLEANUP_UPLOAD,
    { grantId: "grant-1", phase: "record" },
    {
      delaySeconds: 3600,
      idempotencyKey: "upload-prune:grant-1",
    },
  );
});

it("prunes the grant record after its rate-limit window", async () => {
  await handleCleanupUpload({ grantId: "grant-2", phase: "record" });

  expect(cleanupUploadGrant).toHaveBeenCalledWith("grant-2");
  expect(cleanupExpiredTemporaryUpload).not.toHaveBeenCalled();
  expect(pruneUploadGrant).toHaveBeenCalledWith("grant-2");
  expect(enqueueJob).not.toHaveBeenCalled();
});
