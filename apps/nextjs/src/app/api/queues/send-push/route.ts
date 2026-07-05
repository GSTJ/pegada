import { handleCallback } from "@vercel/queue";

import { handleSendPushNotification } from "@pegada/api/queue/handlers/push";
import { ISendNotificationJobData } from "@pegada/api/queue/topics";

// Consumer for the "send-push" topic (see vercel.json).
const handler = handleCallback(async (message: ISendNotificationJobData) => {
  await handleSendPushNotification(message);
});

// Next 15 route type validation requires the exported handler to take
// Request; handleCallback's broader CallbackRequestInput fails that check.
export const POST = (request: Request): Promise<Response> => handler(request);
