import type { IMailJobData } from "@pegada/api/queue/topics";

import { handleMail } from "@pegada/api/queue/handlers/mail";
import { handleCallback } from "@vercel/queue";

// Consumer for the "mail" topic (see vercel.json experimentalTriggers).
// Throwing lets Vercel Queues retry the delivery.
const handler = handleCallback(async (message: IMailJobData) => {
  await handleMail(message);
});

// Next 15 route type validation requires the exported handler to take
// Request; handleCallback's broader CallbackRequestInput fails that check.
export const POST = (request: Request): Promise<Response> => handler(request);
