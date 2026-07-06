import { handleCallback } from "@vercel/queue";

import { handleMail } from "@pegada/api/queue/handlers/mail";
import { IMailJobData } from "@pegada/api/queue/topics";

// Consumer for the "mail" topic (see vercel.json experimentalTriggers).
// Throwing lets Vercel Queues retry the delivery.
const handler = handleCallback(async (message: IMailJobData) => {
  // eslint-disable-next-line no-console
  console.log("[queue-debug] mail route: handler invoked", { message });
  await handleMail(message);
});

// Next 15 route type validation requires the exported handler to take
// Request; handleCallback's broader CallbackRequestInput fails that check.
export const POST = (request: Request): Promise<Response> => {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  // eslint-disable-next-line no-console
  console.log("[queue-debug] mail route: POST hit", {
    url: request.url,
    headers,
  });
  return handler(request);
};
