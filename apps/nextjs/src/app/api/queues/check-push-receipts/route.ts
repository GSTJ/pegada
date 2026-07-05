import { handleCallback } from "@vercel/queue";

import { handleCheckPushReceipts } from "@pegada/api/queue/handlers/push";
import { ICheckPushNotificationReceiptsJobData } from "@pegada/api/queue/topics";

// Consumer for the "check-push-receipts" topic (see vercel.json). Messages
// arrive delayed by RECEIPT_CHECK_DELAY_SECONDS via send()'s delaySeconds.
const handler = handleCallback(async (message: ICheckPushNotificationReceiptsJobData) => {
  await handleCheckPushReceipts(message);
});

// Next 15 route type validation requires the exported handler to take
// Request; handleCallback's broader CallbackRequestInput fails that check.
export const POST = (request: Request): Promise<Response> => handler(request);
