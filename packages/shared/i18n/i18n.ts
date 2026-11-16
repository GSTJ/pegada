import type { LanguageResources } from "./types/types";
import type { i18n } from "i18next";

import { z } from "zod";

import en from "./locales/en";
import ptBr from "./locales/pt-BR";
import { Language, Namespace } from "./types/types";
import { localizedZodError } from "./zod-error";

const resources: Record<Language, LanguageResources> = {
  [Language.EnUs]: en,
  [Language.PtBr]: ptBr,
};

export type BreedSlug = keyof (typeof en)["breed"];

z.config({ customError: localizedZodError });

export const initI18n = (i18n: i18n) => {
  return i18n.init({
    resources,
    fallbackLng: Language.Default,
    compatibilityJSON: "v3", // v4 would require an Intl.PluralRules polyfill, and we aren't using it yet
    ns: Object.keys(resources[Language.EnUs]),
    defaultNS: Namespace.Translation,
    interpolation: {
      escapeValue: false,
    },
  });
};
