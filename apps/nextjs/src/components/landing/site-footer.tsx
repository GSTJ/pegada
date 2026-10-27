import type { StoreCampaign } from "@/app/store/store-urls";
import type { DownloadCtaPage } from "@/services/analytics";

import { clsx } from "clsx";

import { storeUrlFor } from "@/app/store/store-urls";
import { DownloadCta } from "@/components/download-cta";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

import { LanguageSwitch } from "./language-switch";

import s from "./footer.module.css";
import b from "./landing.module.css";

const SUPPORT_EMAIL = "support@pegada.app";
// The other app by the same maker. curvinha.app reads the utm_* params, and utm_campaign becomes its App Store ct.
const CURVINHA_URL =
  "https://curvinha.app/?utm_source=pegada&utm_medium=referral&utm_campaign=pegada-site";

export const SiteFooter = ({
  route,
  page,
  campaign,
}: {
  route: string;
  page: DownloadCtaPage;
  campaign?: StoreCampaign;
}) => {
  const locale = getSafeLocale();
  const home = toLocalePath(locale, "/");
  const onHome = route === "/";
  const anchor = (id: string) => (onHome ? `#${id}` : `${home}#${id}`);
  const referral = campaign?.ref ?? undefined;

  const columns = [
    {
      title: t("landing.chrome.colApp"),
      links: [
        { href: anchor("como-funciona"), label: t("landing.chrome.navHow") },
        { href: anchor("perguntas"), label: t("landing.chrome.navFaq") },
        {
          href: toLocalePath(locale, "/story"),
          label: t("landing.chrome.story"),
        },
      ],
    },
    {
      title: t("landing.chrome.colLegal"),
      links: [
        {
          href: toLocalePath(locale, "/privacy-policy"),
          label: t("landing.chrome.privacy"),
        },
        {
          href: toLocalePath(locale, "/terms-of-use"),
          label: t("landing.chrome.terms"),
        },
        {
          href: toLocalePath(locale, "/delete-account"),
          label: t("landing.chrome.delete"),
        },
      ],
    },
    {
      title: t("landing.chrome.colContact"),
      links: [{ href: `mailto:${SUPPORT_EMAIL}`, label: SUPPORT_EMAIL }],
    },
  ];

  return (
    <footer className={clsx(b.landing, s.foot)}>
      <div className={b.wrap}>
        <div className={s["foot-top"]}>
          <div className={s["foot-brand"]}>
            <a
              className={b.brand}
              data-brand=""
              href={onHome ? "#topo" : home}
              aria-label={t("landing.chrome.brandLabel")}
            >
              {/* oxlint-disable-next-line nextjs/no-img-element -- a 6KB SVG mark; next/image adds a client component for nothing here. */}
              <img
                src="/logo.svg"
                alt=""
                width={26}
                height={27}
                loading="lazy"
              />
              <span>Pegada</span>
            </a>
            <p>{t("landing.chrome.tagline")}</p>
            <p className={s["foot-also"]}>
              {t("landing.chrome.alsoBy")}{" "}
              <a href={CURVINHA_URL}>{t("landing.chrome.curvinha")}</a>
            </p>
            <LanguageSwitch
              large
              route={route}
              current={locale}
              label={t("landing.chrome.langLabel")}
              className={s["foot-lang"]}
            />
          </div>
          <nav
            className={s["foot-cols"]}
            aria-label={t("landing.chrome.footLabel")}
          >
            {columns.map(({ title, links }) => (
              <div key={title}>
                <h3 className={s["foot-h"]}>{title}</h3>
                <ul>
                  {links.map(({ href, label }) => (
                    <li key={href}>
                      <a href={href}>{label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className={s["foot-base"]}>
          <span>© {new Date().getFullYear()} Pegada</span>
          <span>
            <DownloadCta
              href={storeUrlFor({ target: "ios", campaign })}
              target="_blank"
              page={page}
              placement="footer"
              store="app_store"
              referral={referral}
            >
              App Store
            </DownloadCta>{" "}
            ·{" "}
            <DownloadCta
              href={storeUrlFor({ target: "android", campaign })}
              target="_blank"
              page={page}
              placement="footer"
              store="play_store"
              referral={referral}
            >
              Google Play
            </DownloadCta>
          </span>
        </div>
      </div>
    </footer>
  );
};
