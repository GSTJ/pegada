import type {
  ICheckPushNotificationReceiptsJobData,
  ISendNotificationJobData,
} from "../topics";

import type { ExpoPushMessage } from "expo-server-sdk";

import { Expo } from "expo-server-sdk";

import { sendError } from "../../errors/errors";
import { UserService } from "../../services/user-service";
import { config } from "../../shared/config";
import { enqueue } from "../enqueue";
import { TOPICS } from "../topics";

const RECEIPT_EXPIRATION_MIN = 24 * 60 * 60; /** 24 hours */
export const RECEIPT_CHECK_DELAY_SECONDS = 35 * 60; /** 35 minutes */

const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN,
  maxConcurrentRequests: 100,
});

const handlePushError = async (errorMessage: string, pushToken: string) => {
  const newError = new Error(
    `There was an error sending a notification: ${errorMessage}.`,
  );

  if (errorMessage === "DeviceNotRegistered") {
    try {
      await UserService.blacklistPushToken(pushToken);
    } catch (error) {
      sendError(error);
    }
  }

  sendError(newError);
};

export const handleSendPushNotification = async (
  data: ISendNotificationJobData,
) => {
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

  // Error codes: https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
  await Promise.all(
    tickets.flatMap((ticket) =>
      ticket.status === "error" && ticket.details?.error
        ? [handlePushError(ticket.details.error, pushToken)]
        : [],
    ),
  );

  // Tickets for notifications that could not be enqueued have no id.
  const receipts = tickets.flatMap((ticket) =>
    ticket.status === "error" || !ticket.id
      ? []
      : [{ id: ticket.id, pushToken }],
  );

  if (receipts.length > 0) {
    await enqueue(
      TOPICS.CHECK_PUSH_RECEIPTS,
      { receipts },
      {
        delaySeconds: RECEIPT_CHECK_DELAY_SECONDS,
      },
    );
  }
};

export const handleCheckPushReceipts = async ({
  receipts: incomingReceiptsData,
}: ICheckPushNotificationReceiptsJobData) => {
  if (!incomingReceiptsData?.length) return;

  const receipts = await expo.getPushNotificationReceiptsAsync(
    incomingReceiptsData.map(({ id }) => id),
  );

  const tokenFor = (id: string) =>
    incomingReceiptsData.find((receipt) => receipt.id === id)
      ?.pushToken as string;

  const entries = Object.entries(receipts);

  await Promise.all(
    entries.flatMap(([id, receipt]) =>
      receipt.status === "error" && receipt.details?.error
        ? [handlePushError(receipt.details.error, tokenFor(id))]
        : [],
    ),
  );

  // Anything neither errored nor confirmed is still in flight: ask again later.
  const nonProcessedReceipts: typeof incomingReceiptsData = entries
    .filter(([, receipt]) => receipt.status !== "ok" && !receipt.details?.error)
    .map(([id]) => ({ id, pushToken: tokenFor(id) }));

  if (nonProcessedReceipts.length === 0) return;

  sendError(
    `Some push notifications weren't processed. Receipt IDs: ${JSON.stringify(
      nonProcessedReceipts.map(({ id }) => id),
    )}`,
  );

  await enqueue(
    TOPICS.CHECK_PUSH_RECEIPTS,
    { receipts: nonProcessedReceipts },
    {
      delaySeconds: RECEIPT_CHECK_DELAY_SECONDS,
    },
  );
};
