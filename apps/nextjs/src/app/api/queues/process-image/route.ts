import type { IProcessImageJobData } from "@pegada/api/queue/topics";

import { handleProcessImage } from "@pegada/api/queue/handlers/process-image";
import { handleCallback } from "@vercel/queue";

export const maxDuration = 120;

// Consumer for the "process-image" topic (see vercel.json).
const handler = handleCallback(async (message: IProcessImageJobData) => {
  await handleProcessImage(message);
});

// Next 15 route type validation requires the exported handler to take
// Request; handleCallback's broader CallbackRequestInput fails that check.
export const POST = (request: Request): Promise<Response> => handler(request);
