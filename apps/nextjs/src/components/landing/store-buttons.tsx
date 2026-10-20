import type { StoreCampaign } from "@/app/store/store-urls";
import type { DownloadCtaPage } from "@/services/analytics";

import type { ComponentProps } from "react";

import { clsx } from "clsx";

import { storeUrlFor } from "@/app/store/store-urls";
import { DownloadCta } from "@/components/download-cta";
import { t } from "@/lib/translate";

import b from "./landing.module.css";

type StoreButtonsProps = ComponentProps<"div"> & {
  page: DownloadCtaPage;
  placement: string;
  campaign?: StoreCampaign;
};

/** The App Store and Google Play buttons, carrying the visitor's campaign. */
export const StoreButtons = ({
  page,
  placement,
  campaign,
  className,
  ...props
}: StoreButtonsProps) => {
  const referral = campaign?.ref ?? undefined;

  return (
    <div className={clsx(b.stores, className)} {...props}>
      <DownloadCta
        className={b.store}
        href={storeUrlFor({ target: "ios", campaign })}
        target="_blank"
        page={page}
        placement={placement}
        store="app_store"
        referral={referral}
      >
        <span className={clsx(b["store-icon"], b.apple)} aria-hidden="true" />
        <span className={b["store-txt"]}>
          <small>{t("landing.chrome.appStorePre")}</small>App Store
        </span>
      </DownloadCta>
      <DownloadCta
        className={b.store}
        href={storeUrlFor({ target: "android", campaign })}
        target="_blank"
        page={page}
        placement={placement}
        store="play_store"
        referral={referral}
      >
        <span className={clsx(b["store-icon"], b.play)} aria-hidden="true" />
        <span className={b["store-txt"]}>
          <small>{t("landing.chrome.playPre")}</small>Google Play
        </span>
      </DownloadCta>
    </div>
  );
};
