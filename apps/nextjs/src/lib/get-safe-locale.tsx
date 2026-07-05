import { headers, type UnsafeUnwrappedHeaders } from "next/headers";

import { Language } from "@pegada/shared/i18n/types/types";

export const getSafeLocale = () => {
  // Next 15 made `headers()` async; every caller in this app (t(), generateMetadata,
  // RootLayout) is still synchronous, so we keep the documented sync escape hatch
  // rather than cascade `async` through the whole i18n/rendering chain.
  const requestHeaders = headers() as unknown as UnsafeUnwrappedHeaders;

  // We can grab the locale info from there.
  return requestHeaders.get("x-next-intl-locale") ?? Language.Default.toLowerCase();
};
