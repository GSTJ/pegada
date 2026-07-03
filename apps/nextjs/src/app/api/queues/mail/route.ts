import { handleCallback } from "@vercel/queue";

import { handleMail } from "@pegada/api/queue/handlers/mail";
import { IMailJobData } from "@pegada/api/queue/topics";

// Consumer for the "mail" topic (see vercel.json experimentalTriggers).
// Throwing lets Vercel Queues retry the delivery.
export const POST = handleCallback(async (message: IMailJobData) => {
  await handleMail(message);
});
