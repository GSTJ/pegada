import handlebars from "handlebars";
import { ParseKeys } from "i18next";

import { Language, Namespace } from "@pegada/shared/i18n/types/types";

import { config } from "../shared/config";
import { TranslationService } from "./TranslationService";

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
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${config.MAIL_NAME} <${config.MAIL_USER}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend refused the email (${response.status}): ${body}`);
    }

    return (await response.json()) as { id: string };
  }
}
