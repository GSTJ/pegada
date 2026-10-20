import { clsx } from "clsx";

import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  readCampaign,
} from "@/app/store/store-urls";
import { Chat } from "@/components/landing/chat";
import { Closing } from "@/components/landing/closing";
import { Deck } from "@/components/landing/deck";
import { Faq } from "@/components/landing/faq";
import { Hero } from "@/components/landing/hero";
import { Profile } from "@/components/landing/profile";
import { Radius } from "@/components/landing/radius";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Story } from "@/components/landing/story";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLanguage, toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

import b from "@/components/landing/landing.module.css";

/**
 * Only fields the stores back up. No `offers` or `aggregateRating`: the app
 * has in-app purchases and the repo has no rating to cite.
 */
const appJsonLd = (locale: string) => ({
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: "Pegada",
  url: new URL(toLocalePath(locale, "/"), "https://www.pegada.app").href,
  description: t("metadata.description"),
  inLanguage: toLanguage(locale),
  image: "https://www.pegada.app/icon-512.png",
  operatingSystem: "iOS 15.1 or later, Android",
  applicationCategory: "SocialNetworkingApplication",
  sameAs: [APP_STORE_URL, PLAY_STORE_URL],
  author: {
    "@type": "Person",
    name: "Gabriel Taveira",
    url: "https://gabrieltaveira.dev",
  },
});

const LandingPage = async ({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) => {
  // `/store` redirects desktop visitors here with whatever campaign they
  // arrived on, so the store buttons can carry it the rest of the way.
  const campaign = readCampaign(
    new URLSearchParams(
      Object.entries((await searchParams) ?? {}).flatMap(([key, value]) =>
        typeof value === "string" ? [[key, value] as [string, string]] : [],
      ),
    ),
  );

  return (
    <div className={clsx(b.landing, b.page)}>
      <SiteHeader route="/" campaign={campaign} />
      <main id="main" tabIndex={-1} className={b.main}>
        <Hero campaign={campaign} />
        <Profile />
        <Deck />
        <Radius />
        <Chat />
        <Story />
        <Faq />
        <Closing campaign={campaign} />
      </main>
      <SiteFooter route="/" page="landing" campaign={campaign} />
      <Reveal />
      <script
        type="application/ld+json"
        // oxlint-disable-next-line react/no-danger, react-perf/jsx-no-new-object-as-prop -- JSON-LD has to be inline text, and a server component never re-renders; `<` is escaped so the payload cannot close the tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(appJsonLd(getSafeLocale())).replaceAll(
            "<",
            String.raw`\u003c`,
          ),
        }}
      />
    </div>
  );
};

export default LandingPage;
