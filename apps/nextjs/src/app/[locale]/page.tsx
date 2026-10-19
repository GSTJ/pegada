import {
  APP_STORE_URL,
  PLAY_STORE_URL,
  readCampaign,
} from "@/app/store/store-urls";
import { Breeds } from "@/components/landing/breeds";
import { SiteFooter } from "@/components/landing/footer";
import { SiteHeader } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Preferences } from "@/components/landing/preferences";
import { Profile } from "@/components/landing/profile";
import { Reveal } from "@/components/landing/reveal";
import { StoryAndCta } from "@/components/landing/story-and-cta";
import { Walk } from "@/components/landing/walk";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLanguage, toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

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
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Hero campaign={campaign} />
        <Profile />
        <Breeds />
        <Preferences />
        <Walk />
        <StoryAndCta campaign={campaign} />
      </main>
      <SiteFooter campaign={campaign} />
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
    </>
  );
};

export default LandingPage;
