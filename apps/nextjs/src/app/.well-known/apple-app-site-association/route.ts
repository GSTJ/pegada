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
 * locale prefix), so both need an entry.
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
      // Rarely changes, but `APPLE_TEAM_ID` is still a placeholder here, so
      // `immutable` would be a lie — a long max-age is enough.
      "Cache-Control": "public, max-age=86400",
    },
  });
