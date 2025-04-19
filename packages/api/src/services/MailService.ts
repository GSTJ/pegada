import fs from "fs/promises";
import handlebars from "handlebars";
import { ParseKeys } from "i18next";
import nodemailer from "nodemailer";

import { Language, Namespace } from "@pegada/shared/i18n/types/types";

import { config } from "../shared/config";
import { TranslationService } from "./TranslationService";

// Create a Nodemailer transport using SendGrid
const mailer = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: config.SENDGRID_API_KEY
  }
});

export class MailService {
  // Inspired from this snippet
  // https://github.com/UUDigitalHumanitieslab/handlebars-i18next/blob/develop/handlebars-i18next.es6
  static registerTranslationHelper(language = Language.Default) {
    handlebars.registerHelper(
      "translate",
      function (
        this: never,
        key: ParseKeys<Namespace.Mail>,
        options: { hash: Record<string, string | number> }
      ): handlebars.SafeString {
        const result = TranslationService.translate(key, {
          lng: language,
          ns: Namespace.Mail,
          replace: options.hash
        });

        return new handlebars.SafeString(result);
      }
    );
  }

  static async parseHandlebars({
    path,
    variables,
    language = Language.Default
  }: {
    path: string;
    variables: Record<string, string | number>;
    language?: Language;
  }) {
    if ("language" in variables) {
      throw new Error('Cannot use "language" as a variable name');
    }

    const template = await fs.readFile(path, "utf8");

    MailService.registerTranslationHelper(language);

    const handlebarsTemplate = handlebars.compile(template);

    return handlebarsTemplate({ ...variables, language });
  }

  static async sendMail({
    to,
    subject,
    html,
    text
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }) {
    return mailer.sendMail({
      from: {
        name: config.MAIL_NAME,
        address: config.MAIL_USER
      },
      to,
      subject,
      html,
      text
    });
  }
}
