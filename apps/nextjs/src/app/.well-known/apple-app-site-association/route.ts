import { APPLE_APP_ID } from "@/lib/app-links";

// Static: iOS fetches this file unauthenticated, over plain HTTPS, with no
// locale or user context, so there is nothing here that ever needs to vary
// per request.
export const dynamic = "force-static";

/**
 * Apple resolves this file (no `.json` extension, exact path) once per app
 * install to decide which HTTP(S) links `app.pegada` is allowed to open
 * in-app instead of in Safari. `components` is the modern replacement for
 * the deprecated `paths` array — each entry is a URL-component pattern, `*`
 * matches one or more path segments. The web app serves dog profiles at
 * both `/dog/:id` (default locale) and `/pt-br/dog/:id` (non-default
 * locale prefix), so both need an entry: next-intl runs `localePrefix:
 * "as-needed"` and 307s a `Accept-Language: pt-BR` browser onto the
 * prefixed URL, which is then the one that gets copied and shared.
 *
 * Claiming a path the app has no route for is worse than not claiming it:
 * iOS would hand the URL to the app and the app would land on expo-router's
 * "Unmatched Route" screen instead of letting Safari render the page. Every
 * pattern here therefore needs a matching expo-router route in
 * apps/mobile/src/app and a matching Android intent filter in
 * apps/mobile/app.config.ts. tests/apple-app-site-association.test.mjs is
 * what keeps those three in step, including when a locale is added.
 *
 * `webcredentials` reuses the same `appID` to let iOS offer autofill for
 * credentials shared between the app and this domain. Nothing on the app
 * side depends on it yet, but declaring it now is free.
 */
const body = {
  applinks: {
    details: [
      {
        appIDs: [APPLE_APP_ID],
        components: [
          {
            "/": "/dog/*",
            comment: "Match dog profile share links in the default locale",
          },
          {
            "/": "/pt-br/dog/*",
            comment: "Match dog profile share links under the pt-BR prefix",
          },
        ],
      },
    ],
  },
  webcredentials: {
    apps: [APPLE_APP_ID],
  },
};

export const GET = () =>
  Response.json(body, {
    headers: {
      // Apple's own crawler ignores Content-Type, but browsers and other
      // tooling that inspect this URL expect JSON, and the spec calls for it.
      "Content-Type": "application/json",
      // Rarely changes, but not worth the risk of `immutable` breaking a
      // future rotation, so a long max-age is enough.
      "Cache-Control": "public, max-age=86400",
    },
  });
