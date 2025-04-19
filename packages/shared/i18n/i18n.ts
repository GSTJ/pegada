import { i18n } from "i18next";
import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";

import en from "./locales/en";
import ptBr from "./locales/pt-BR";
import { Language, LanguageResources, Namespace } from "./types/types";

const resources: Record<Language, LanguageResources> = {
  [Language.EnUs]: en,
  [Language.PtBr]: ptBr
};

export type BreedSlug = keyof (typeof en)["breed"];

z.setErrorMap(
  makeZodI18nMap({
    ns: [Namespace.Zod, Namespace.Translation],
    handlePath: {
      keyPrefix: "paths"
    }
  })
);

export const initI18n = (i18n: i18n) => {
  return i18n.init({
    resources: resources,
    fallbackLng: Language.Default,
    compatibilityJSON: "v3", // v4 would require an Intl.PluralRules polyfill, and we aren't using it yet
    ns: Object.keys(resources[Language.EnUs]),
    defaultNS: Namespace.Translation,
    interpolation: {
      escapeValue: false
    }
  });
};
