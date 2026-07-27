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
  // build time and a template literal (what `unicorn/prefer-string-raw` would
  // rewrite it to) fails that analysis with "Invalid segment configuration
  // export". magic-oxlint-config 1.1.0 turns that rule off for `middleware.ts`
  // in the `next` preset, so no local disable is needed to keep it this way.
  matcher: ["/((?!api|store|_next|.*\\..*).*)"],
};
