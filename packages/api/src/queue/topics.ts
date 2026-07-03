import { Image } from "@prisma/client";
import { ExpoPushMessage } from "expo-server-sdk";

import { Language } from "@pegada/shared/i18n/types/types";

export const TOPICS = {
  MAIL: "mail",
  PROCESS_IMAGE: "process-image",
  SEND_PUSH: "send-push",
  CHECK_PUSH_RECEIPTS: "check-push-receipts",
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

export type TopicPayloads = {
  [TOPICS.MAIL]: IMailJobData;
  [TOPICS.PROCESS_IMAGE]: IProcessImageJobData;
  [TOPICS.SEND_PUSH]: ISendNotificationJobData;
  [TOPICS.CHECK_PUSH_RECEIPTS]: ICheckPushNotificationReceiptsJobData;
};
