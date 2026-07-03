import { handleCallback } from "@vercel/queue";

import { handleProcessImage } from "@pegada/api/queue/handlers/processImage";
import { IProcessImageJobData } from "@pegada/api/queue/topics";

export const maxDuration = 120;

// Consumer for the "process-image" topic (see vercel.json).
export const POST = handleCallback(async (message: IProcessImageJobData) => {
  await handleProcessImage(message);
});
