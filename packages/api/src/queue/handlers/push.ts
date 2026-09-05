import type { ExpoDeliveryResult } from "../../shared/push-errors";
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
import { DEAD_TOKEN_ERROR, isDeadTokenError } from "../../shared/push-errors";
import { enqueue } from "../enqueue";
import { TOPICS } from "../topics";

const RECEIPT_EXPIRATION_MIN = 24 * 60 * 60; /** 24 hours */
export const RECEIPT_CHECK_DELAY_SECONDS = 35 * 60; /** 35 minutes */

const expo = new Expo({
  accessToken: config.EXPO_ACCESS_TOKEN,
  maxConcurrentRequests: 100,
});

/**
 * Take a token Expo has rejected out of circulation.
 *
 * Best effort. A prune that fails is worth reporting, but it must not fail a
 * job whose push has already been handed over: the queue would retry the send
 * and the user would see it twice.
 */
const pruneToken = async (pushToken: string) => {
  try {
    await UserService.blacklistPushToken(pushToken);

    return true;
  } catch (error) {
    sendError(error);

    return false;
  }
};

type DeliveryEvent =
  | typeof ANALYTICS_EVENTS.PUSH_RECEIPT_RESULT
  | typeof ANALYTICS_EVENTS.PUSH_TICKET_RESULT;

type DeliveryOutcome = {
  errorCode: string | null;
  status: PushDeliveryStatus;
  /** Expo says the token is gone, so nothing may be sent to it again. */
  deadToken: boolean;
};

/**
 * Neither confirmed nor rejected yet, so there is nothing to record.
 *
 * Read off the status rather than off `details.error`: Expo does not always
 * put a code on a rejection, and treating an uncoded rejection as unsettled
 * had it queued for another look every thirty-five minutes forever, while the
 * dead token that caused it stayed in the database.
 */
const isInFlight = (result: ExpoDeliveryResult) =>
  result.status !== "ok" && result.status !== "error";

/**
 * Expo's answer, in the two fields the events break down by.
 *
 * An error with no code of its own still counts as an error: what matters for
 * the ok rate is that the push did not make it, and `Unknown` is a more honest
 * bucket than dropping the row. A dead token recognised from the message alone
 * is filed under the code it would have carried, so the ok rate does not split
 * the same failure across two buckets and the cadence gate, which reads the
 * code back off `NotificationLog`, sees it.
 */
const outcomeOf = (result: ExpoDeliveryResult): DeliveryOutcome => {
  if (result.status !== "error") {
    return { errorCode: null, status: "ok", deadToken: false };
  }

  const deadToken = isDeadTokenError(result);

  return {
    errorCode: deadToken
      ? DEAD_TOKEN_ERROR
      : (result.details?.error ?? "Unknown"),
    status: "error",
    deadToken,
  };
};

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
  tokenPruned: boolean,
) => {
  if (userId) {
    captureEvent(userId, event, {
      error_code: errorCode,
      kind: pushKind ?? null,
      status,
      token_pruned: tokenPruned,
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

/**
 * Everything that has to happen once Expo has answered about one push.
 *
 * The prune comes before the event on purpose, so the event can say whether
 * the token was actually dropped. That turns "how many dead devices are we
 * still holding" into a number on the same series as the error code it came
 * from, rather than something only the database knows.
 *
 * `DeviceNotRegistered` is deliberately not reported as an error. Somebody
 * uninstalling the app is the expected end of a push token, and reporting it
 * made it the loudest exception on the server while the only sensible response
 * to it, dropping the token, was already happening one line above. Every other
 * code still goes to the funnel, because those are the ones nobody has looked
 * at yet.
 */
const settle = async (
  event: DeliveryEvent,
  attribution: PushAttribution,
  pushToken: string | undefined,
  result: ExpoDeliveryResult,
) => {
  const outcome = outcomeOf(result);

  const tokenPruned =
    outcome.deadToken && pushToken ? await pruneToken(pushToken) : false;

  await recordDelivery(event, attribution, outcome, tokenPruned);

  if (outcome.status !== "error" || outcome.deadToken) return;

  sendError(
    new Error(
      `There was an error sending a notification: ${outcome.errorCode}.`,
    ),
  );
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
  await Promise.all(
    tickets.map((ticket) =>
      settle(
        ANALYTICS_EVENTS.PUSH_TICKET_RESULT,
        attribution,
        pushToken,
        ticket,
      ),
    ),
  );

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

      return [
        settle(
          ANALYTICS_EVENTS.PUSH_RECEIPT_RESULT,
          reference ?? {},
          reference?.pushToken,
          receipt,
        ),
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
