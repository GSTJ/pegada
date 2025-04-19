import { ParseKeys, TOptions } from "i18next";

import { TranslationService } from "@pegada/api/services/TranslationService";
import { Namespace } from "@pegada/shared/i18n/types/types";

import { getSafeLocale } from "@/lib/get-safe-locale";

export const t = <T extends Namespace = Namespace.Web>(
  key: ParseKeys<T>,
  options: {
    ns?: T;
  } & TOptions = {}
) => {
  const lng = getSafeLocale();

  const ns = options.ns ?? Namespace.Web;

  // Not needed, we type the props correctly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return TranslationService.translate(key, { lng, ...options, ns } as any);
};
