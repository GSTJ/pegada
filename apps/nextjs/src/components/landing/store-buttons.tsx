import type { StoreCampaign } from "@/app/store/store-urls";
import type { DownloadCtaPage } from "@/services/analytics";

import Image from "next/image";

import { storeUrlFor } from "@/app/store/store-urls";
import { DownloadCta } from "@/components/download-cta";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

type StoreButtonsProps = {
  /** What the visitor arrived with (`readCampaign`), carried into the store. */
  campaign?: StoreCampaign;
  page?: DownloadCtaPage;
  /** Reported on `Download CTA Clicked`, e.g. `hero`, `cta`, `footer`. */
  placement: string;
  className?: string;
};

const STORES = [
  {
    target: "ios",
    store: "app_store",
    icon: "/app-store-icon.svg",
    label: "landing.chrome.appStore",
  },
  {
    target: "android",
    store: "play_store",
    icon: "/google-play-icon.svg",
    label: "landing.chrome.googlePlay",
  },
] as const;

/**
 * Both store links. White on every field (pink, navy, paper) in both schemes,
 * so they never depend on the section around them for contrast.
 */
export const StoreButtons = ({
  campaign,
  page = "landing",
  placement,
  className,
}: StoreButtonsProps) => (
  <div className={cn("flex flex-wrap gap-3", className)}>
    {STORES.map(({ target, store, icon, label }) => (
      <DownloadCta
        key={store}
        href={storeUrlFor({ target, campaign })}
        target="_blank"
        page={page}
        placement={placement}
        store={store}
        referral={campaign?.ref ?? undefined}
        className="inline-flex min-h-[52px] flex-1 whitespace-nowrap items-center justify-center gap-2.5 rounded-button bg-white px-[22px] focus-visible:outline-ink text-base font-bold tracking-[-0.01em] text-navy shadow-print transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px hover:shadow-card active:scale-[0.97] sm:flex-none"
      >
        <Image
          src={icon}
          alt=""
          width={22}
          height={22}
          className="size-[22px]"
        />
        {t(label)}
      </DownloadCta>
    ))}
  </div>
);
