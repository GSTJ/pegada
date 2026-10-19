import { getRequestPathname, getSafeLocale } from "@/lib/get-safe-locale";
import { LOCALE_SEGMENTS, toLanguage, toRoutePath } from "@/lib/locales";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

/** Each language in its own name, so a reader finds theirs in either locale. */
const LANGUAGE_NAMES: Record<string, string> = {
  "en-us": "English",
  "pt-br": "Português",
};

type LanguageSwitchProps = {
  /** `compact` only offers the other language (header); `full` lists both. */
  variant?: "compact" | "full";
  className?: string;
};

/**
 * The same page in the other language. Every link carries the locale prefix,
 * `/en-us` included: that spelling is what tells the middleware this was a
 * choice (`lib/locale-cookie.ts`), so English sticks for a visitor whose
 * browser asks for Portuguese. Plain anchors, so the middleware sees a fresh
 * request and can set the cookie on the redirect.
 */
export const LanguageSwitch = ({
  variant = "full",
  className,
}: LanguageSwitchProps) => {
  const locale = getSafeLocale();
  const routePath = toRoutePath(getRequestPathname());
  const segments =
    variant === "compact"
      ? LOCALE_SEGMENTS.filter((segment) => segment !== locale)
      : LOCALE_SEGMENTS;
  // One link in the header; the footer's full list is the page's one
  // language landmark (two navs with the same name fail landmark-unique).
  const Wrapper = variant === "compact" ? "div" : "nav";

  return (
    <Wrapper
      aria-label={
        variant === "compact" ? undefined : t("landing.chrome.languageLabel")
      }
      className={className}
    >
      <ul className="flex gap-1.5">
        {segments.map((segment) => (
          <li key={segment}>
            <a
              href={`/${segment}${routePath === "/" ? "" : routePath}`}
              hrefLang={toLanguage(segment)}
              lang={toLanguage(segment)}
              aria-current={segment === locale ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-[10px] px-2.5 font-bold underline-offset-[5px] hover:underline",
                segment === locale && "bg-blush",
              )}
            >
              {LANGUAGE_NAMES[segment] ?? segment}
            </a>
          </li>
        ))}
      </ul>
    </Wrapper>
  );
};
