import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  // A list of all locales that are supported
  locales: ["en-us", "pt-br"],

  localeDetection: true,

  localePrefix: "as-needed",

  // If this locale is matched, pathnames work without a prefix (e.g. `/about`)
  defaultLocale: "en-us",
});

export const config = {
  // Skip all paths that should not be internationalized.
  //
  // Has to stay a plain string literal: Next statically analyses this export at
  // build time and a template literal (what `unicorn/prefer-string-raw` rewrites
  // it to) fails that analysis with "Invalid segment configuration export".
  // oxlint-disable-next-line unicorn/prefer-string-raw -- see above
  matcher: ["/((?!api|store|_next|.*\\..*).*)"],
};
