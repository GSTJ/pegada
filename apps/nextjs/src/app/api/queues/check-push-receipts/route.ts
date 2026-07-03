import { handleCallback } from "@vercel/queue";

import { handleCheckPushReceipts } from "@pegada/api/queue/handlers/push";
import { ICheckPushNotificationReceiptsJobData } from "@pegada/api/queue/topics";

// Consumer for the "check-push-receipts" topic (see vercel.json). Messages
// arrive delayed by RECEIPT_CHECK_DELAY_SECONDS via send()'s delaySeconds.
export const POST = handleCallback(async (message: ICheckPushNotificationReceiptsJobData) => {
  await handleCheckPushReceipts(message);
});
