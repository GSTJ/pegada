import { LanguageSwitch } from "@/components/landing/language-switch";
import { PawPrint } from "@/components/landing/paw-print";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

/**
 * Sits on the pink field the hero continues, navy at night. The anchors point
 * at the home page's sections, so the same header works on the legal pages.
 */
export const SiteHeader = () => {
  const home = toLocalePath(getSafeLocale(), "/");

  return (
    <header className="bg-field text-ink">
      <a
        href="#main"
        className="sr-only rounded-xl bg-paper px-4 py-2.5 font-bold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50"
      >
        {t("landing.chrome.skipToContent")}
      </a>
      <div className="wrap flex h-[72px] items-center justify-between gap-3">
        <a
          href={home}
          aria-label={t("landing.chrome.home")}
          className="inline-flex min-h-11 items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em]"
        >
          <PawPrint className="w-[30px] text-navy dark:text-pink" />
          Pegada
        </a>
        <div className="flex items-center gap-2 sm:gap-6">
          <nav
            aria-label={t("landing.chrome.navLabel")}
            className="hidden lg:block"
          >
            <ul className="flex gap-7 text-[15px] font-bold">
              <li>
                <a
                  href={`${home}#walk`}
                  className="inline-flex min-h-11 items-center underline-offset-[5px] hover:underline"
                >
                  {t("landing.chrome.walk")}
                </a>
              </li>
              <li>
                <a
                  href={`${home}#story`}
                  className="inline-flex min-h-11 items-center underline-offset-[5px] hover:underline"
                >
                  {t("landing.chrome.story")}
                </a>
              </li>
            </ul>
          </nav>
          <LanguageSwitch variant="compact" className="text-[15px]" />
          <a
            href={`${home}#get`}
            className="inline-flex min-h-11 items-center rounded-xl bg-navy px-[18px] text-[15px] font-bold text-white transition-transform duration-150 ease-out active:scale-[0.97] dark:bg-pink dark:text-navy"
          >
            {t("landing.chrome.getTheApp")}
          </a>
        </div>
      </div>
    </header>
  );
};
