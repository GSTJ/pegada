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

export type ISendNotificationJobData = ExpoPushMessage;

export type ICheckPushNotificationReceiptsJobData = {
  receipts?: { id: string; pushToken: string }[];
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
