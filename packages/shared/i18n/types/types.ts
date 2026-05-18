/* oxlint-disable typescript/no-duplicate-enum-values -- `Default` aliases another enum member by design */
import en from "../locales/en";

export enum Namespace {
  Translation = "translation",
  Breed = "breed",
  Zod = "zod",
  Server = "server",
  Mail = "mail",
  Web = "web",
}

// This makes TS complain if a key is missing, making our JSON files type-safe
export type LanguageResources = typeof en;

export enum Language {
  EnUs = "en-US",
  PtBr = "pt-BR",
  Default = "en-US",
}

// Overwrite the existing interface so we can add our custom namespace
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: Namespace.Translation;
    resources: LanguageResources;
  }
}
