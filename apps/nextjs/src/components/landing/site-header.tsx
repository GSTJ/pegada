import type { StoreCampaign } from "@/app/store/store-urls";

import { storeUrlFor } from "@/app/store/store-urls";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

import { HeaderBar } from "./header-bar";
import { LanguageSwitch } from "./language-switch";

/**
 * `route` is the page's path without the locale, e.g. `/` or
 * `/privacy-policy`. Off the home page the in-page links point back home.
 */
export const SiteHeader = ({
  route,
  campaign,
}: {
  route: string;
  campaign?: StoreCampaign;
}) => {
  const locale = getSafeLocale();
  const home = toLocalePath(locale, "/");
  const onHome = route === "/";
  const anchor = (id: string) => (onHome ? `#${id}` : `${home}#${id}`);

  return (
    <HeaderBar
      brandHref={onHome ? "#topo" : home}
      brandLabel={t("landing.chrome.brandLabel")}
      skipLabel={t("landing.chrome.skip")}
      navLabel={t("landing.chrome.navLabel")}
      howHref={anchor("como-funciona")}
      howLabel={t("landing.chrome.navHow")}
      faqHref={anchor("perguntas")}
      faqLabel={t("landing.chrome.navFaq")}
      ctaHref={anchor("baixar")}
      ctaLabel={t("landing.chrome.getApp")}
      iosHref={storeUrlFor({ target: "ios", campaign })}
      androidHref={storeUrlFor({ target: "android", campaign })}
      page={onHome ? "landing" : "legal"}
      referral={campaign?.ref ?? undefined}
    >
      <LanguageSwitch
        route={route}
        current={locale}
        label={t("landing.chrome.langLabel")}
      />
    </HeaderBar>
  );
};
