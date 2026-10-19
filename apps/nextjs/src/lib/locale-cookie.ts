/** next-intl's cookie. It decides which language an unprefixed URL gets. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/**
 * Marks a language-switch click into a non-default locale
 * (`/pt-br/story?lang`). The middleware stores the choice and redirects to the
 * clean URL, so the marker never ends up in a link someone copies.
 */
export const LOCALE_CHOICE_PARAM = "lang";

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
 * - `choose`: another locale's prefix with {@link LOCALE_CHOICE_PARAM}, which
 *   only the language switch adds. Stored, then redirected without it.
 * - `ignore`: everything else, shared `/pt-br` links included, leaves the
 *   visitor's choice (or the browser's `Accept-Language`) alone.
 *
 * Kept free of imports so `tests/locale-cookie.test.mjs` can load it under
 * plain `node --test`.
 */
export const localeCookiePolicy = (
  pathname: string,
  defaultSegment: string,
  segments: readonly string[],
  search = "",
) => {
  const [, first = ""] = pathname.toLowerCase().split("/");

  if (first === defaultSegment) return "persist";
  if (
    segments.includes(first) &&
    new URLSearchParams(search).has(LOCALE_CHOICE_PARAM)
  ) {
    return "choose";
  }

  return "ignore";
};
