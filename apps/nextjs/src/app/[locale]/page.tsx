import { clsx } from "clsx";

import { readCampaign } from "@/app/store/store-urls";
import { Deck } from "@/components/landing/deck";
import { Hero } from "@/components/landing/hero";
import { Profile } from "@/components/landing/profile";
import { Radius } from "@/components/landing/radius";
import { Reveal } from "@/components/landing/reveal";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

import b from "@/components/landing/landing.module.css";

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
      </main>
      <SiteFooter route="/" page="landing" campaign={campaign} />
      <Reveal />
    </div>
  );
};

export default LandingPage;
