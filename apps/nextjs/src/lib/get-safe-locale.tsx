import { headers, type UnsafeUnwrappedHeaders } from "next/headers";

import { Language } from "@pegada/shared/i18n/types/types";

import { PATHNAME_HEADER } from "@/lib/locales";

// Next 15 made `headers()` async; every caller in this app (t(), generateMetadata,
// RootLayout) is still synchronous, so we keep the documented sync escape hatch
// rather than cascade `async` through the whole i18n/rendering chain.
const getRequestHeaders = () => headers() as unknown as UnsafeUnwrappedHeaders;

export const getSafeLocale = () => {
  // We can grab the locale info from there.
  return (
    getRequestHeaders().get("x-next-intl-locale") ??
    Language.Default.toLowerCase()
  );
};

/**
 * The pathname as the browser asked for it, before next-intl's rewrite. Set by
 * the middleware; absent on the paths its matcher skips, which only ever reach
 * a 404 anyway.
 */
export const getRequestPathname = () =>
  getRequestHeaders().get(PATHNAME_HEADER) ?? "/";
