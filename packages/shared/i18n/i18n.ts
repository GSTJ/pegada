import type { i18n, InitOptions } from "i18next";

import "intl-pluralrules";

import { z } from "zod";
import { makeZodI18nMap } from "zod-i18n-map";

import type { LanguageResources } from "./types/types";
import en from "./locales/en";
import ptBr from "./locales/pt-BR";
import { Language, Namespace } from "./types/types";

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

export const initI18n = (i18nInstance: i18n) => {
  const options: InitOptions = {
    resources,
    fallbackLng: Language.Default,
    compatibilityJSON: "v4",
    ns: Object.keys(resources[Language.EnUs]),
    defaultNS: Namespace.Translation,
    interpolation: {
      escapeValue: false
    }
  };
  return i18nInstance.init(options);
};
