import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // A list of all locales that are supported
  locales: ["en-us", "pt-br"],

  localeDetection: true,

  localePrefix: "as-needed",

  // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
  defaultLocale: "en-us"
});

export const config = {
  // Skip all paths that should not be internationalized
  matcher: ["/((?!api|store|_next|.*\\..*).*)"]
};
