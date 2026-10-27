import type { MetadataRoute } from "next";

const BASE_URL = "https://www.pegada.app";

// Keep in sync with the `locales` list in `src/middleware.ts`.
const LOCALES = ["en-us", "pt-br"] as const;

// `localePrefix: "as-needed"` (middleware.ts) means the default locale
// (en-us) is served unprefixed and every other locale is prefixed.
const DEFAULT_LOCALE: (typeof LOCALES)[number] = "en-us";

// Static, indexable pages. `terms-of-use` and `delete-account` are noindex
// (see `generateLocalizedMdxMetadata`), so they stay out of the sitemap. `/dog/[id]` is excluded on purpose: those pages
// are per-swipe-card and not meant to be crawled or ranked individually.
const PAGES = ["", "story", "privacy-policy"] as const;

const localizedPath = (
  locale: (typeof LOCALES)[number],
  page: (typeof PAGES)[number],
) => {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;

  return page === "" ? prefix || "/" : `${prefix}/${page}`;
};

// No `lastModified` on purpose: the site has no dated content, and a made-up
// date is worse than none.
const sitemap = (): MetadataRoute.Sitemap => {
  return PAGES.flatMap((page) => {
    const languages = Object.fromEntries(
      LOCALES.map((locale) => [
        locale,
        `${BASE_URL}${localizedPath(locale, page)}`,
      ]),
    );

    return LOCALES.map((locale) => ({
      url: `${BASE_URL}${localizedPath(locale, page)}`,
      alternates: { languages },
    }));
  });
};

export default sitemap;
