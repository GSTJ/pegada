import type { ICleanupUploadJobData } from "../topics";

import {
  ImageService,
  UPLOAD_GRANT_WINDOW_SECONDS,
} from "../../services/image-service";
import { enqueue } from "../enqueue";
import { TOPICS } from "../topics";

export const handleCleanupUpload = async ({
  grantId,
  phase,
}: ICleanupUploadJobData) => {
  if (phase === "record") {
    await ImageService.cleanupUploadGrant(grantId);
    await ImageService.pruneUploadGrant(grantId);
    return;
  }

  await ImageService.cleanupExpiredTemporaryUpload(grantId);
  await enqueue(
    TOPICS.CLEANUP_UPLOAD,
    { grantId, phase: "record" },
    {
      delaySeconds: UPLOAD_GRANT_WINDOW_SECONDS,
      idempotencyKey: `upload-prune:${grantId}`,
    },
  );
};
