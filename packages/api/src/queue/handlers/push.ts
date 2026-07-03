import { Expo, ExpoPushMessage } from "expo-server-sdk";

import { sendError } from "../../errors/errors";
import { UserService } from "../../services/UserService";
import { config } from "../../shared/config";
import { enqueue } from "../enqueue";
import {
  ICheckPushNotificationReceiptsJobData,
  ISendNotificationJobData,
  TOPICS,
} from "../topics";

const RECEIPT_EXPIRATION_MIN = 24 * 60 * 60; /** 24 hours */
export const RECEIPT_CHECK_DELAY_SECONDS = 35 * 60; /** 35 minutes */

const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN,
  maxConcurrentRequests: 100,
});

const handlePushError = async (errorMessage: string, pushToken: string) => {
  const newError = new Error(
    `There was an error sending a notification: ${errorMessage}. Push Token: ${pushToken}.`,
  );

  if (errorMessage === "DeviceNotRegistered") {
    try {
      await UserService.blacklistPushToken(pushToken);
    } catch (err) {
      sendError(err);
    }
  }

  sendError(newError);
};

export const handleSendPushNotification = async (data: ISendNotificationJobData) => {
  const message: ExpoPushMessage = {
    sound: "default",
    priority: "high",
    channelId: "default",
    expiration: Math.floor(Date.now() / 1000) + RECEIPT_EXPIRATION_MIN,
    badge: 1,
    ...data,
  };

  const pushToken = data.to as string;

  const tickets = await expo.sendPushNotificationsAsync([message]);

  const receipts: { id: string; pushToken: string }[] = [];

  for (const ticket of tickets) {
    // Error codes: https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
    if (ticket.status === "error") {
      if (ticket.details && ticket.details.error) {
        await handlePushError(ticket.details.error, pushToken);
      }
      continue;
    }

    // Tickets for notifications that could not be enqueued have no id.
    if (ticket.id) {
      receipts.push({ id: ticket.id, pushToken });
    }
  }

  if (receipts.length) {
    await enqueue(TOPICS.CHECK_PUSH_RECEIPTS, { receipts }, {
      delaySeconds: RECEIPT_CHECK_DELAY_SECONDS,
    });
  }
};

export const handleCheckPushReceipts = async ({
  receipts: incomingReceiptsData,
}: ICheckPushNotificationReceiptsJobData) => {
  if (!incomingReceiptsData?.length) return;

  const receipts = await expo.getPushNotificationReceiptsAsync(
    incomingReceiptsData.map(({ id }) => id),
  );

  const nonProcessedReceipts: typeof incomingReceiptsData = [];

  for (const [id, receipt] of Object.entries(receipts)) {
    const pushToken = incomingReceiptsData.find((r) => r.id === id)?.pushToken as string;

    if (receipt.status === "error" && receipt.details?.error) {
      await handlePushError(receipt.details.error, pushToken);
      continue;
    }

    if (receipt.status === "ok") continue;

    nonProcessedReceipts.push({ id, pushToken });
  }

  if (!nonProcessedReceipts.length) return;

  sendError(
    `Some push notifications weren't processed. Receipts: ${JSON.stringify(nonProcessedReceipts)}`,
  );

  await enqueue(TOPICS.CHECK_PUSH_RECEIPTS, { receipts: nonProcessedReceipts }, {
    delaySeconds: RECEIPT_CHECK_DELAY_SECONDS,
  });
};
