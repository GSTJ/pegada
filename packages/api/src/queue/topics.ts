import type { Language } from "@pegada/shared/i18n/types/types";
import type { Image } from "@prisma/client";

import type { ExpoPushMessage } from "expo-server-sdk";

export const TOPICS = {
  MAIL: "mail",
  PROCESS_IMAGE: "process-image",
  SEND_PUSH: "send-push",
  CHECK_PUSH_RECEIPTS: "check-push-receipts",
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

export interface IMailJobData {
  email: string;
  code: string;
  language?: Language;
}

export type IProcessImageJobData = Partial<Image> & { id: string; url: string };

export type ISendNotificationJobData = ExpoPushMessage;

export interface ICheckPushNotificationReceiptsJobData {
  receipts?: { id: string; pushToken: string }[];
}

export interface TopicPayloads {
  [TOPICS.MAIL]: IMailJobData;
  [TOPICS.PROCESS_IMAGE]: IProcessImageJobData;
  [TOPICS.SEND_PUSH]: ISendNotificationJobData;
  [TOPICS.CHECK_PUSH_RECEIPTS]: ICheckPushNotificationReceiptsJobData;
}
