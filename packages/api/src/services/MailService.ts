import Cloudflare from "cloudflare";
import handlebars from "handlebars";
import { ParseKeys } from "i18next";

import { Language, Namespace } from "@pegada/shared/i18n/types/types";

import { config } from "../shared/config";
import { TranslationService } from "./TranslationService";

const cloudflare = new Cloudflare({ apiToken: config.CLOUDFLARE_EMAIL_API_TOKEN });

export class MailService {
  // Inspired from this snippet
  // https://github.com/UUDigitalHumanitieslab/handlebars-i18next/blob/develop/handlebars-i18next.es6
  static registerTranslationHelper(language = Language.Default) {
    handlebars.registerHelper(
      "translate",
      function (
        this: never,
        key: ParseKeys<Namespace.Mail>,
        options: { hash: Record<string, string | number> },
      ): handlebars.SafeString {
        const result = TranslationService.translate(key, {
          lng: language,
          ns: Namespace.Mail,
          replace: options.hash,
        });

        return new handlebars.SafeString(result);
      },
    );
  }

  static async compileTemplate({
    template,
    variables,
    language = Language.Default,
  }: {
    template: string;
    variables: Record<string, string | number>;
    language?: Language;
  }) {
    if ("language" in variables) {
      throw new Error('Cannot use "language" as a variable name');
    }

    MailService.registerTranslationHelper(language);

    const handlebarsTemplate = handlebars.compile(template);

    return handlebarsTemplate({ ...variables, language });
  }

  static async sendMail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    if (!config.CLOUDFLARE_ACCOUNT_ID || !config.CLOUDFLARE_EMAIL_API_TOKEN) {
      throw new Error(
        "Cannot send email: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_EMAIL_API_TOKEN are not set",
      );
    }

    return cloudflare.emailSending.send({
      account_id: config.CLOUDFLARE_ACCOUNT_ID,
      from: { address: config.MAIL_USER, name: config.MAIL_NAME },
      to,
      subject,
      html,
      text,
    });
  }
}
