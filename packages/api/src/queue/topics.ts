import type { PushKind } from "@pegada/shared/analytics/events";
import type { Language } from "@pegada/shared/i18n/types/types";
import type { Image } from "@prisma/client";

import type { ExpoPushMessage } from "expo-server-sdk";

export const TOPICS = {
  MAIL: "mail",
  PROCESS_IMAGE: "process-image",
  SEND_PUSH: "send-push",
  CHECK_PUSH_RECEIPTS: "check-push-receipts",
  CLEANUP_UPLOAD: "cleanup-upload",
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

export type IMailJobData = {
  email: string;
  code: string;
  language?: Language;
};

export type IProcessImageJobData = Partial<Image> & { id: string; url: string };

/**
 * Who a push is for and what it is, carried alongside the Expo message and
 * stripped back off before it is handed to Expo.
 *
 * All three are optional because they are attribution rather than delivery:
 * a push with none of them still goes out, it just cannot be counted. Every
 * caller in the codebase sets them, so an unattributed push in PostHog means
 * a new send path that forgot to.
 */
export type PushAttribution = {
  /**
   * The `NotificationLog` row to stamp with the outcome. Only the scheduled
   * nudges have one; transactional pushes are not logged.
   */
  notificationLogId?: string;
  /** Breakdown property on the ticket and receipt events. */
  pushKind?: PushKind;
  /** Distinct id for those events, so delivery is readable per person. */
  userId?: string;
};

export type ISendNotificationJobData = ExpoPushMessage & PushAttribution;

/**
 * Attribution rides along with each receipt id because a receipt is checked
 * in a separate job, half an hour after the send, with none of the context
 * that produced it.
 */
export type IPushReceiptReference = PushAttribution & {
  id: string;
  pushToken: string;
};

export type ICheckPushNotificationReceiptsJobData = {
  receipts?: IPushReceiptReference[];
};

export type ICleanupUploadJobData = {
  grantId: string;
  phase: "object" | "record";
};

export type TopicPayloads = {
  [TOPICS.MAIL]: IMailJobData;
  [TOPICS.PROCESS_IMAGE]: IProcessImageJobData;
  [TOPICS.SEND_PUSH]: ISendNotificationJobData;
  [TOPICS.CHECK_PUSH_RECEIPTS]: ICheckPushNotificationReceiptsJobData;
  [TOPICS.CLEANUP_UPLOAD]: ICleanupUploadJobData;
};
