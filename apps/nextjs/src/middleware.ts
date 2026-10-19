import { NextRequest, NextResponse } from "next/server";

import createMiddleware from "next-intl/middleware";

import {
  LOCALE_CHOICE_PARAM,
  LOCALE_COOKIE,
  localeCookiePolicy,
} from "@/lib/locale-cookie";
import {
  DEFAULT_LOCALE_SEGMENT,
  LOCALE_SEGMENTS,
  PATHNAME_HEADER,
} from "@/lib/locales";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const handleI18nRouting = createMiddleware({
  // A list of all locales that are supported
  locales: LOCALE_SEGMENTS,

  localeDetection: true,

  localePrefix: "as-needed",

  // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
  defaultLocale: DEFAULT_LOCALE_SEGMENT,

  // next-intl v4 makes it a session cookie. It only ever holds a choice the
  // visitor made in the language switch now, so it should outlive the tab.
  localeCookie: { maxAge: ONE_YEAR_IN_SECONDS },
});

/** Drops a `Set-Cookie` next-intl queued, without expiring the browser's copy. */
const dropQueuedCookie = (response: Response, name: string) => {
  const kept = response.headers
    .getSetCookie()
    .filter((cookie) => !cookie.startsWith(`${name}=`));

  response.headers.delete("set-cookie");
  for (const cookie of kept) response.headers.append("set-cookie", cookie);
};

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
  const policy = localeCookiePolicy(
    request.nextUrl.pathname,
    DEFAULT_LOCALE_SEGMENT,
    LOCALE_SEGMENTS,
    request.nextUrl.search,
  );

  if (policy === "choose") {
    const url = request.nextUrl.clone();
    url.searchParams.delete(LOCALE_CHOICE_PARAM);
    const response = NextResponse.redirect(url);
    response.cookies.set(
      LOCALE_COOKIE,
      request.nextUrl.pathname.split("/")[1]?.toLowerCase() ?? "",
      { path: "/", maxAge: ONE_YEAR_IN_SECONDS, sameSite: "lax" },
    );
    return response;
  }

  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);

  const response = handleI18nRouting(new NextRequest(request, { headers }));

  if (policy !== "persist") dropQueuedCookie(response, LOCALE_COOKIE);

  return response;
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
