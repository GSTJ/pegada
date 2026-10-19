import type { StoreCampaign } from "@/app/store/store-urls";
import type { DownloadCtaPage } from "@/services/analytics";

import Link from "next/link";

import { LanguageSwitch } from "@/components/landing/language-switch";
import { PawPrint } from "@/components/landing/paw-print";
import { StoreButtons } from "@/components/landing/store-buttons";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

const LINKS = [
  { route: "/story", label: "landing.chrome.story" },
  { route: "/privacy-policy", label: "landing.chrome.privacy" },
  { route: "/terms-of-use", label: "landing.chrome.terms" },
  { route: "/delete-account", label: "landing.chrome.deleteAccount" },
] as const;

const LINK =
  "inline-flex min-h-11 items-center underline-offset-[5px] hover:underline";

type SiteFooterProps = {
  campaign?: StoreCampaign;
  page?: DownloadCtaPage;
};

export const SiteFooter = ({ campaign, page = "landing" }: SiteFooterProps) => {
  const locale = getSafeLocale();

  return (
    <footer className="border-t border-ink/10 py-12 text-[15px] text-ink-muted">
      <div className="wrap grid gap-8">
        <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-10">
          <Link
            href={toLocalePath(locale, "/")}
            aria-label={t("landing.chrome.home")}
            className="inline-flex min-h-11 w-fit items-center gap-2.5 text-[22px] font-extrabold tracking-[-0.03em] text-ink"
          >
            <PawPrint className="w-[30px] text-pink" />
            Pegada
          </Link>
          <ul className="flex flex-wrap gap-x-6 font-bold text-ink">
            {LINKS.map(({ route, label }) => (
              <li key={route}>
                <Link href={toLocalePath(locale, route)} className={LINK}>
                  {t(label)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://www.producthunt.com/posts/pegada"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK}
              >
                {t("landing.chrome.productHunt")}
              </a>
            </li>
          </ul>
          <LanguageSwitch className="text-ink" />
        </div>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <StoreButtons campaign={campaign} page={page} placement="footer" />
          <p>
            {t("landing.chrome.madeWithLoveBy")}{" "}
            <a
              href="https://gabrieltaveira.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-bold text-ink underline-offset-[5px] hover:underline"
            >
              Gabriel Taveira
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};
