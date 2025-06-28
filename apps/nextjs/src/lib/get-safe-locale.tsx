import { headers } from "next/headers";

import { Language } from "@pegada/shared/i18n/types/types";

export const getSafeLocale = async () => {
  const requestHeaders = await headers();

  // We can grab the locale info from there.
  return requestHeaders.get("x-next-intl-locale") ?? Language.Default;
};
