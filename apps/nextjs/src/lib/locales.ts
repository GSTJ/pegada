import { Language } from "@pegada/shared/i18n/types/types";

/**
 * Routing spells locales lowercase (`/pt-br`) while i18next keys its resources
 * by BCP 47 (`pt-BR`), so both spellings are derived from the same enum rather
 * than written out twice and left to drift. `Language.Default` aliases
 * `Language.EnUs`, hence the dedupe.
 */
const LANGUAGE_BY_SEGMENT = new Map(
  Object.values(Language).map((language) => [language.toLowerCase(), language]),
);

/** Locale segments the `[locale]` route accepts, e.g. `["en-us", "pt-br"]`. */
export const LOCALE_SEGMENTS = [...LANGUAGE_BY_SEGMENT.keys()];

export const DEFAULT_LOCALE_SEGMENT = Language.Default.toLowerCase();

export const isLocaleSegment = (segment: string) =>
  LANGUAGE_BY_SEGMENT.has(segment);

export const toLanguage = (segment: string) =>
  LANGUAGE_BY_SEGMENT.get(segment) ?? Language.Default;

/** Open Graph wants `pt_BR` where BCP 47 wants `pt-BR`. */
export const toOpenGraphLocale = (segment: string) =>
  toLanguage(segment).replace("-", "_");

/**
 * Strips the locale prefix off a request path, so `/pt-br/privacy-policy` and
 * `/privacy-policy` both come back as `/privacy-policy`.
 */
export const toRoutePath = (pathname: string) => {
  const [, maybeLocale, ...rest] = pathname.split("/");

  if (!maybeLocale || !isLocaleSegment(maybeLocale)) return pathname;

  return `/${rest.join("/")}`.replace(/\/$/, "") || "/";
};

/**
 * The inverse: where a given route lives in a given locale. `localePrefix` is
 * `as-needed`, so the default locale is served unprefixed.
 */
export const toLocalePath = (segment: string, routePath: string) => {
  if (segment === DEFAULT_LOCALE_SEGMENT) return routePath;

  return routePath === "/" ? `/${segment}` : `/${segment}${routePath}`;
};

/** Request header the middleware forwards the pre-rewrite pathname on. */
export const PATHNAME_HEADER = "x-pathname";
