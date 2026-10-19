import type { StoreCampaign } from "@/app/store/store-urls";

import Image from "next/image";
import Link from "next/link";

import { IdCard } from "@/components/landing/id-card";
import { StoreButtons } from "@/components/landing/store-buttons";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

/**
 * Placeholder: the story maker, then the closing ask with a blank ID that
 * already carries the paw stamp. Only the `dm-aberta` story is shown because
 * it is the only design the app lets you make today.
 */
export const StoryAndCta = ({ campaign }: { campaign?: StoreCampaign }) => {
  const locale = getSafeLocale();

  return (
    <>
      <section
        id="story"
        aria-labelledby="story-title"
        data-reveal
        className="bg-navy py-section text-white dark:bg-page"
      >
        <div className="wrap grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="grid max-w-[40rem] justify-items-start gap-[18px]">
            <h2
              id="story-title"
              data-role="title"
              className="text-balance text-title"
            >
              {t("landing.storyCta.story.title")}
            </h2>
            <p data-role="lede" className="text-lg text-[#D6DAE8]">
              {t("landing.storyCta.story.description")}
            </p>
            <Link
              data-role="action"
              href={toLocalePath(locale, "/story")}
              className="inline-flex min-h-11 items-center font-bold underline decoration-pink decoration-2 underline-offset-[5px]"
            >
              {t("landing.storyCta.story.link")}
            </Link>
          </div>
          <div data-role="card" className="flex justify-center">
            <Image
              src="/story/dm-aberta.webp"
              alt={t("story.examples.chat.alt")}
              width={900}
              height={1600}
              sizes="(min-width: 1024px) 250px, 40vw"
              className="w-[clamp(140px,22vw,250px)] rotate-[3.5deg] rounded-[14px] shadow-[0_24px_50px_-20px_rgb(0_0_0/0.7)]"
            />
          </div>
        </div>
      </section>

      <section
        id="get"
        aria-labelledby="get-title"
        data-reveal
        className="overflow-hidden bg-field py-section text-ink"
      >
        <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="grid justify-items-start gap-[22px]">
            <h2
              id="get-title"
              data-role="title"
              className="text-balance text-title"
            >
              {t("landing.storyCta.cta.title")}
            </h2>
            <p data-role="lede" className="text-lede">
              {t("landing.storyCta.cta.description")}
            </p>
            <div data-role="action" className="grid gap-3">
              <StoreButtons campaign={campaign} placement="cta" />
              <p className="text-[15px]">{t("landing.storyCta.cta.free")}</p>
            </div>
          </div>
          <div data-role="card">
            <IdCard className="max-w-[640px]" />
          </div>
        </div>
      </section>
    </>
  );
};
