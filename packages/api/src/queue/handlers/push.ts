import type {
  ICheckPushNotificationReceiptsJobData,
  IPushReceiptReference,
  ISendNotificationJobData,
  PushAttribution,
} from "../topics";
import type { PushDeliveryStatus } from "@pegada/shared/analytics/events";

import type { ExpoPushMessage } from "expo-server-sdk";

import { Expo } from "expo-server-sdk";

import prisma from "@pegada/database";
import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";

import { sendError } from "../../errors/errors";
import { UserService } from "../../services/user-service";
import { captureEvent } from "../../shared/analytics";
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

type DeliveryEvent =
  | typeof ANALYTICS_EVENTS.PUSH_RECEIPT_RESULT
  | typeof ANALYTICS_EVENTS.PUSH_TICKET_RESULT;

type DeliveryOutcome = {
  errorCode: string | null;
  status: PushDeliveryStatus;
};

/** A ticket or a receipt, in the two fields both of them answer with. */
type ExpoResult = { details?: { error?: string }; status: string };

/** Neither confirmed nor rejected yet, so there is nothing to record. */
const isInFlight = (result: ExpoResult) =>
  result.status !== "ok" && !result.details?.error;

/**
 * Expo's answer, in the two fields the events break down by.
 *
 * An error with no code of its own still counts as an error: what matters for
 * the ok rate is that the push did not make it, and `Unknown` is a more honest
 * bucket than dropping the row.
 */
const outcomeOf = (result: ExpoResult): DeliveryOutcome =>
  result.status === "error"
    ? { errorCode: result.details?.error ?? "Unknown", status: "error" }
    : { errorCode: null, status: "ok" };

/**
 * Write down what became of one push.
 *
 * Two halves, because they answer different questions. The analytics event is
 * the readable one: an ok rate per kind in PostHog, which is the first number
 * this stack has ever had for "was it delivered" as opposed to "was it
 * enqueued". The `NotificationLog` stamp is the auditable one, for asking
 * about a single send after the fact.
 *
 * Neither may fail the job. A push that went out and could not be recorded is
 * a gap in a chart; throwing here would have the queue retry a send that has
 * already happened, which the user would see twice.
 */
const recordDelivery = async (
  event: DeliveryEvent,
  { notificationLogId, pushKind, userId }: PushAttribution,
  { errorCode, status }: DeliveryOutcome,
) => {
  if (userId) {
    captureEvent(userId, event, {
      error_code: errorCode,
      kind: pushKind ?? null,
      status,
    });
  }

  if (!notificationLogId) return;

  try {
    await prisma.notificationLog.update({
      where: { id: notificationLogId },
      data:
        event === ANALYTICS_EVENTS.PUSH_TICKET_RESULT
          ? { ticketError: errorCode, ticketStatus: status }
          : { receiptError: errorCode, receiptStatus: status },
    });
  } catch (error) {
    sendError(error);
  }
};

export const handleSendPushNotification = async (
  data: ISendNotificationJobData,
) => {
  // Attribution is ours, not Expo's, so it comes back off before the message
  // is built rather than being spread into it.
  const { notificationLogId, pushKind, userId, ...push } = data;
  const attribution: PushAttribution = { notificationLogId, pushKind, userId };

  const message: ExpoPushMessage = {
    sound: "default",
    priority: "high",
    channelId: "default",
    expiration: Math.floor(Date.now() / 1000) + RECEIPT_EXPIRATION_MIN,
    badge: 1,
    ...push,
  };

  const pushToken = data.to as string;

  const tickets = await expo.sendPushNotificationsAsync([message]);

  // Error codes: https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
  await Promise.all([
    ...tickets.map((ticket) =>
      recordDelivery(
        ANALYTICS_EVENTS.PUSH_TICKET_RESULT,
        attribution,
        outcomeOf(ticket),
      ),
    ),
    ...tickets.flatMap((ticket) =>
      ticket.status === "error" && ticket.details?.error
        ? [handlePushError(ticket.details.error, pushToken)]
        : [],
    ),
  ]);

  // Tickets for notifications that could not be enqueued have no id.
  const receipts = tickets.flatMap((ticket) =>
    ticket.status === "error" || !ticket.id
      ? []
      : [{ id: ticket.id, pushToken, ...attribution }],
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

  const referenceFor = (id: string) =>
    incomingReceiptsData.find((receipt) => receipt.id === id);

  const entries = Object.entries(receipts);

  await Promise.all(
    entries.flatMap(([id, receipt]) => {
      if (isInFlight(receipt)) return [];

      const reference = referenceFor(id);
      const pushToken = reference?.pushToken;

      return [
        recordDelivery(
          ANALYTICS_EVENTS.PUSH_RECEIPT_RESULT,
          reference ?? {},
          outcomeOf(receipt),
        ),
        ...(receipt.status === "error" && receipt.details?.error && pushToken
          ? [handlePushError(receipt.details.error, pushToken)]
          : []),
      ];
    }),
  );

  // Anything neither errored nor confirmed is still in flight: ask again later.
  // The attribution rides along, otherwise a push that takes two rounds to
  // settle loses the user and kind it belongs to.
  const nonProcessedReceipts: IPushReceiptReference[] = entries
    .filter(([, receipt]) => isInFlight(receipt))
    .flatMap(([id]) => {
      const reference = referenceFor(id);

      return reference ? [reference] : [];
    });

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
