import { handleCallback } from "@vercel/queue";

import { handleSendPushNotification } from "@pegada/api/queue/handlers/push";
import { ISendNotificationJobData } from "@pegada/api/queue/topics";

// Consumer for the "send-push" topic (see vercel.json).
export const POST = handleCallback(async (message: ISendNotificationJobData) => {
  await handleSendPushNotification(message);
});
