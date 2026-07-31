import { NextRequest } from "next/server";

import createMiddleware from "next-intl/middleware";

import {
  DEFAULT_LOCALE_SEGMENT,
  LOCALE_SEGMENTS,
  PATHNAME_HEADER,
} from "@/lib/locales";

const handleI18nRouting = createMiddleware({
  // A list of all locales that are supported
  locales: LOCALE_SEGMENTS,

  localeDetection: true,

  localePrefix: "as-needed",

  // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
  defaultLocale: DEFAULT_LOCALE_SEGMENT,
});

/**
 * next-intl rewrites `/privacy-policy` to `/en-us/privacy-policy` before Next
 * routes it, and the App Router never hands a layout the request path, so
 * `generateMetadata` has no way to build a self-referencing canonical on its
 * own. Forwarding the original pathname as a request header is what gets it
 * there: `new NextRequest(request, { headers })` is the Fetch API's own
 * clone-with-different-headers, and next-intl copies the request headers onto
 * the rewrite it emits, so the value survives into the render.
 */
const middleware = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  return handleI18nRouting(new NextRequest(request, { headers }));
};

export default middleware;

export const config = {
  // Skip all paths that should not be internationalized.
  //
  // Has to stay a plain string literal: Next statically analyses this export at
  // build time and a template literal (what `unicorn/prefer-string-raw` would
  // rewrite it to) fails that analysis with "Invalid segment configuration
  // export". magic-oxlint-config 1.1.0 turns that rule off for `middleware.ts`
  // in the `next` preset, so no local disable is needed to keep it this way.
  matcher: ["/((?!api|store|_next|.*\\..*).*)"],
};
