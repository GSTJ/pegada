import type { ISendNotificationJobData } from "@pegada/api/queue/topics";

import { handleSendPushNotification } from "@pegada/api/queue/handlers/push";
import { handleCallback } from "@vercel/queue";

// Consumer for the "send-push" topic (see vercel.json).
const handler = handleCallback(async (message: ISendNotificationJobData) => {
  await handleSendPushNotification(message);
});

// Next 15 route type validation requires the exported handler to take
// Request; handleCallback's broader CallbackRequestInput fails that check.
export const POST = (request: Request): Promise<Response> => handler(request);
