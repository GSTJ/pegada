# pr-assets

Orphan branch. Holds screenshots and other evidence files embedded in pull
request descriptions via `raw.githubusercontent.com` links — nothing here
is source, nothing here is meant to build, and nothing here should ever be
merged into `main` or any other branch.

Each PR gets its own subdirectory, named after the branch it evidences.

## web/robots-sitemap

Evidence for `web/robots-sitemap` (Pegada web, Wave 1, PR 1/4): local
`next start` screenshots showing `/robots.txt` and `/sitemap.xml` served as
their own files instead of falling through to the homepage HTML.

## web/metadata-og

Evidence for `web/metadata-og` (Pegada web, Wave 1, PR 2/4):

- `og-image.png` — the 1200x630 card, cropped from `.github/images/banner.png`.
- `social-cards-mock.png` — a hand-built local mock of the WhatsApp and X
  cards, rendered from the tags the branch emits. Not a live scrape.
- `head-diff-*.diff` — rendered `<head>` before/after, from `next start`,
  fetched with a `Twitterbot/1.0` user agent so Next blocks on metadata
  instead of streaming it into the body.
- `status-before.txt` / `status-after.txt` — HTTP status per path, showing
  the unknown-locale paths going 200 -> 404.
