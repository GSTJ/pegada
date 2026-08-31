import type { ICleanupUploadJobData } from "@pegada/api/queue/topics";

import { handleCleanupUpload } from "@pegada/api/queue/handlers/upload";
import { handleCallback } from "@vercel/queue";

const handler = handleCallback(async (message: ICleanupUploadJobData) => {
  await handleCleanupUpload(message);
});

export const POST = (request: Request): Promise<Response> => handler(request);
