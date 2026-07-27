import type { ParseKeys, TOptions } from "i18next";

import { TranslationService } from "@pegada/api/services/translation-service";
import { Namespace } from "@pegada/shared/i18n/types/types";

import { getSafeLocale } from "@/lib/get-safe-locale";

export const t = <T extends Namespace = Namespace.Web>(
  key: ParseKeys<T>,
  options: {
    ns?: T;
  } & TOptions = {},
) => {
  const lng = getSafeLocale();

  const ns = options.ns ?? Namespace.Web;

  // Not needed, we type the props correctly
  // oxlint-disable-next-line typescript/no-explicit-any -- i18next's key/options relationship is not expressible here; the props are typed at the call site.
  return TranslationService.translate(key, { lng, ...options, ns } as any);
};
