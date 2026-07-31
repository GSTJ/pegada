import type { MetadataRoute } from "next";

const BASE_URL = "https://www.pegada.app";

// Keep in sync with the `locales` list in `src/middleware.ts`.
const LOCALES = ["en-us", "pt-br"] as const;

// `localePrefix: "as-needed"` (middleware.ts) means the default locale
// (en-us) is served unprefixed and every other locale is prefixed.
const DEFAULT_LOCALE: (typeof LOCALES)[number] = "en-us";

// Static, indexable pages. `/dog/[id]` is excluded on purpose: those pages
// are per-swipe-card and not meant to be crawled or ranked individually.
const PAGES = ["", "privacy-policy", "terms-of-use", "delete-account"] as const;

const localizedPath = (
  locale: (typeof LOCALES)[number],
  page: (typeof PAGES)[number],
) => {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;

  return page === "" ? prefix || "/" : `${prefix}/${page}`;
};

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
