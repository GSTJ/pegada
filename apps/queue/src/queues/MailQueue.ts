import { resolve } from "path";
import { Worker } from "bullmq";

import { redisConnection } from "@pegada/api/constants/redis";
import { IMailJobData, MAIL_QUEUE } from "@pegada/api/queue/MailQueue";
import { MailService } from "@pegada/api/services/MailService";
import { TranslationService } from "@pegada/api/services/TranslationService";

export const worker = new Worker<IMailJobData>(
  MAIL_QUEUE,
  async ({ data: { code, language, email } }) => {
    const emailHtml = await MailService.parseHandlebars({
      path: resolve(
        process.cwd(),
        "..",
        "..",
        "packages",
        "api",
        "src",
        "mails",
        "verify_code.hbs"
      ),
      variables: {
        otp: code,
        year: new Date().getFullYear()
      },
      language: language
    });

    MailService.sendMail({
      to: email,
      html: emailHtml,
      subject: TranslationService.translate("server:mail.verifyCode.subject", {
        lng: language
      }),
      text: TranslationService.translate("server:mail.verifyCode.text", {
        lng: language
      })
    });
  },
  { connection: redisConnection, concurrency: 1 }
);
