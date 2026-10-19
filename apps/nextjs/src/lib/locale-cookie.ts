/** next-intl's cookie. It decides which language an unprefixed URL gets. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * What a request may do to {@link LOCALE_COOKIE}.
 *
 * next-intl writes the cookie on every prefixed visit, so one tap on a shared
 * `/pt-br` link used to send every English URL to Portuguese from then on,
 * with nothing on the page to undo it. Only an explicit choice writes it now:
 *
 * - `persist`: the default locale spelled out (`/en-us/...`). Nothing links
 *   there except the language switch, and next-intl redirects it to the
 *   unprefixed URL with the cookie set, so the choice of English sticks.
 * - `clear`: any other locale prefix (`/pt-br/...`). The page is already in
 *   that language, and dropping a stale English choice hands the bare domain
 *   back to the browser's `Accept-Language`.
 * - `ignore`: unprefixed URLs leave the cookie alone.
 *
 * Kept free of imports so `tests/locale-cookie.test.mjs` can load it under
 * plain `node --test`.
 */
export const localeCookiePolicy = (
  pathname: string,
  defaultSegment: string,
  segments: readonly string[],
) => {
  const [, first = ""] = pathname.toLowerCase().split("/");

  if (first === defaultSegment) return "persist";
  if (segments.includes(first)) return "clear";

  return "ignore";
};
