import i18n from "i18next";

import { initI18n } from "@pegada/shared/i18n/i18n";

import { sendError } from "../errors/errors";

export class TranslationService {
  static async init() {
    await initI18n(i18n);
  }

  static translate = i18n.t;
}

TranslationService.init().catch(sendError);
