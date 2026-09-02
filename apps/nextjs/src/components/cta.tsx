import type { StoreCampaign } from "@/app/store/store-urls";

import Link from "next/link";

import { storeUrlFor } from "@/app/store/store-urls";
import { StoreButton } from "@/components/store-button";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

/**
 * `campaign` is what the visitor arrived with. `/store` sends desktop traffic
 * here rather than to a store nobody can install from, so these two badges are
 * the end of that funnel and the last chance to keep the referrer attached.
 */
export const Cta = ({ campaign }: { campaign?: StoreCampaign }) => {
  return (
    <div className="self-center lg:self-start lg:min-w-[300px] max-w-[30rem] flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <h1 className="appearFromBottom text-center lg:text-left text-6xl font-extrabold text-text">
          {t("home.title")}
        </h1>
        <p className="appearFromBottom text-center lg:text-left text-gray-500 text-xl font-light text-text">
          {t("home.description")}
        </p>
      </div>
      <div className="appearFromBottom flex gap-3 flex-col lg:flex-row">
        <StoreButton
          href={storeUrlFor({ target: "ios", campaign })}
          target="_blank"
          page="landing"
          placement="hero"
          store="app_store"
          referral={campaign?.ref ?? undefined}
        >
          <StoreButton.Icon
            width={20}
            height={20}
            src="/app-store-icon.svg"
            alt="App Store"
          />
          <StoreButton.Text>{t("home.cta.appStore")}</StoreButton.Text>
        </StoreButton>
        <StoreButton
          href={storeUrlFor({ target: "android", campaign })}
          target="_blank"
          page="landing"
          placement="hero"
          store="play_store"
          referral={campaign?.ref ?? undefined}
        >
          <StoreButton.Icon
            width={24}
            height={24}
            src="/google-play-icon.svg"
            alt="Google Play"
          />
          <StoreButton.Text>{t("home.cta.googlePlay")}</StoreButton.Text>
        </StoreButton>
      </div>
      {/*
       * The story page's only way in used to be a line at the foot of the
       * homepage, 4,600px down on a phone. This one sits under the badges, in
       * the first screen, which is the whole difference between a page with
       * traffic and a page without.
       *
       * `toLocalePath` rather than a bare `/story`, so a Portuguese reader
       * stays in Portuguese instead of being handed to the middleware's guess.
       */}
      {/*
       * The negative margin pays back the padding: the line keeps the 24px it
       * looks like inside the column's gap, and the box a thumb has to land on
       * is 44px tall.
       */}
      <Link
        href={toLocalePath(getSafeLocale(), "/story")}
        className="appearFromBottom -my-2.5 flex min-h-[44px] items-center justify-center self-center py-2.5 text-center font-semibold text-text underline decoration-primary decoration-2 underline-offset-4 hover:text-primary lg:justify-start lg:self-start lg:text-left"
      >
        {t("home.storyLink")}
      </Link>
    </div>
  );
};
