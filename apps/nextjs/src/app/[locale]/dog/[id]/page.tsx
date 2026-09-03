import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { isReferralRef } from "@pegada/shared/utils/referral";

import { DownloadCta } from "@/components/download-cta";
import { gilroy } from "@/lib/fonts";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath, toOpenGraphLocale } from "@/lib/locales";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import {
  getDog,
  getDogArticle,
  getDogArticleLowercase,
  getDogDescription,
  getDogImage,
  getDogPronoun,
  getDogSubjectPronoun,
  getDogTagline,
} from "./get-dog";

type DogProfileProps = {
  params: Promise<{
    id: string;
  }>;
  /**
   * `ref` is the id of whoever shared this card. Read on the page and nowhere
   * else: `generateMetadata` below never sees it, so the Open Graph card a
   * link previewer scrapes is identical for every sharer and stays cacheable.
   */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/** Where these pages live, before the locale prefix is put back on. */
const ROUTE_PATH = "/dog";

export const generateMetadata = async ({
  params,
}: DogProfileProps): Promise<Metadata> => {
  const { id } = await params;
  const dog = await getDog(id);

  // Never indexed either way — this is a share card, not a landing page —
  // but a missing dog still needs a title/description that isn't "undefined".
  if (!dog) {
    return { robots: { index: false, follow: false } };
  }

  const lng = getSafeLocale();
  const title = t("dog.metadata.title", { name: dog.name, lng });
  const description = getDogDescription(dog, lng);
  const url = toLocalePath(lng, `${ROUTE_PATH}/${id}`);

  // `opengraph-image.tsx` next door is picked up by file convention, but the
  // URL Next writes for it is the rewritten, always-prefixed path
  // (`/en-us/dog/…`), which 307s to the unprefixed one on the default locale,
  // and it is resolved against the request host instead of `metadataBase`. A
  // scraper that does not follow redirects shows no card at all, which is
  // every English share. Naming the image here puts it on the path the locale
  // actually serves, and a relative URL is resolved against the layout's
  // `metadataBase`, so previews point at the canonical domain from any
  // deployment.
  const images = [
    {
      url: `${url}/opengraph-image`,
      width: 1200,
      height: 630,
      type: "image/png",
      alt: t("dog.metadata.ogImageAlt", { name: dog.name, lng }),
    },
  ];

  // `openGraph` replaces the root layout's wholesale rather than merging into
  // it, so `url`, `siteName` and `locale` have to be restated here or this
  // page's card loses them, same as `/story`. `alternates` is a separate field
  // and still comes from the layout.
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      type: "profile",
      locale: toOpenGraphLocale(lng),
      siteName: "Pegada",
      url,
      title,
      description,
      images,
    },
    twitter: { card: "summary_large_image", title, description, images },
  };
};

const DogProfile = async ({ params, searchParams }: DogProfileProps) => {
  const { id } = await params;
  const dog = await getDog(id);
  const lng = getSafeLocale();

  if (!dog) {
    return notFound();
  }

  // Same regex the app and the API use. A `ref` that does not survive it is
  // dropped here rather than forwarded, because the next stop is an App Store
  // campaign token and a Play install referrer.
  const query = await searchParams;
  const referral = isReferralRef(query?.ref) ? query.ref : undefined;

  // The store route sniffs the user agent and redirects; `ref` and `dog` are
  // what it turns into per-store attribution parameters.
  const storeHref = referral ? `/store?ref=${referral}&dog=${id}` : "/store";

  const dogImage = getDogImage(dog);
  const tagline = getDogTagline(dog, lng);
  const invite = t("dog.hero.invite", {
    name: dog.name,
    article: getDogArticle(dog),
  });
  const nextStep = t("dog.hero.nextStep", {
    name: dog.name,
    article: getDogArticleLowercase(dog),
    pronoun: getDogPronoun(dog, lng),
  });
  const ctaButton = t("dog.cta.button", {
    name: dog.name,
    article: getDogArticleLowercase(dog),
  });
  const mobileContext = t("dog.cta.mobileContext", {
    pronoun: getDogSubjectPronoun(dog, lng),
  });

  return (
    <div
      className={cn(
        gilroy.variable,
        "relative flex min-h-screen flex-col overflow-hidden bg-[#FFF9FB] font-gilroy",
      )}
    >
      {/*
       * The only decoration on the page: a soft echo of the brand gradient
       * (see public/logo.svg) blooming behind the card. Everything else here
       * stays plain so the photo keeps the attention.
       */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,129,189,0.14)_0%,rgba(251,110,144,0.05)_45%,rgba(255,129,189,0)_72%)] blur-2xl md:left-[30%] md:top-1/2 md:h-[720px] md:w-[720px] md:-translate-y-1/2"
      />

      {/*
       * Centred on a phone, where the card sits directly underneath it, and
       * pinned to the left of the same container as `main` on a desktop, so
       * it reads as the page's header instead of floating over the gap
       * between the two columns.
       */}
      <header className="relative z-10 mx-auto w-full max-w-5xl px-4 md:px-8">
        {/* oxlint-disable-next-line nextjs/no-img-element -- A static SVG needs no next/image pipeline. */}
        <img
          src="/logo.svg"
          draggable="false"
          alt=""
          className="mx-auto mt-4 h-8 select-none md:mx-0 md:mt-8 md:h-9"
        />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-start gap-6 px-4 pb-24 pt-4 md:grid md:grid-cols-[minmax(0,400px)_1fr] md:items-center md:justify-normal md:gap-16 md:px-8 md:pb-16 md:pt-0">
        {/* The card: this page's entire pitch is "here is the product, with your friend's dog already in it." */}
        <div className="flex w-full max-w-[380px] flex-1 flex-col fill-mode-both animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none md:max-w-none md:flex-none">
          <div className="relative w-full flex-1 overflow-hidden rounded-[28px] bg-gradient-to-b from-primary via-[#FB6E90] to-[#DC5791] shadow-[0_20px_60px_-15px_rgba(220,87,145,0.45)] md:aspect-[4/5] md:flex-none">
            {dogImage ? (
              // This photo is the page: it is the LCP element on every
              // /dog/[id] view. A plain <img> in the initial HTML is
              // visible to the browser's preload scanner, so it starts
              // fetching in the first round of requests without any
              // manual `preload()` call.
              //
              // Deliberately not `next/image`: this URL is on the media
              // CDN and `images.remotePatterns` is not configured, so
              // switching would mean routing user photos through the
              // optimiser — a bigger change than this page needs. The
              // gradient behind it is the loading placeholder, so there
              // is no flash of white either way.
              // oxlint-disable-next-line nextjs/no-img-element -- see comment above; deliberately not next/image
              <img
                src={dogImage}
                alt={dog.name}
                fetchPriority="high"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* oxlint-disable-next-line nextjs/no-img-element -- A static SVG needs no next/image pipeline. */}
                <img src="/logo.svg" alt="" className="h-16 w-16 opacity-90" />
              </div>
            )}

            {Boolean(dog.breed?.name) && (
              // Same frosted pill as the app's breed tag (`breed-tag.tsx` +
              // `Glassmorphism`), with the fill inverted. In the app that tag
              // sits on a photo the deck has already darkened; here it sits on
              // the raw photo, and a white tint on a white dog leaves white
              // text on white. A dark fill carries its own contrast, so it
              // reads on a snow shot and on a black lab alike.
              <div className="absolute right-4 top-4 flex h-8 items-center rounded-xl border border-white/15 bg-black/55 px-3 leading-none text-white backdrop-blur-md">
                <span className="text-sm font-medium">
                  {t(`${dog.breed?.slug as BreedSlug}`, {
                    ns: Namespace.Breed,
                  })}
                </span>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-5 pb-5 pt-16">
              {/*
               * The leading is restated at every size that changes the size.
               * Tailwind's `text-*` utilities set a line height as well, and
               * the responsive ones are emitted after `leading-*`, so a bare
               * `leading-tight` here was overridden by `md:text-3xl` and the
               * name rendered at a leading of 1.
               */}
              <h1 className="text-2xl font-extrabold leading-[1.15] text-white md:text-3xl md:leading-[1.1]">
                {dog.name}
              </h1>
              {tagline ? (
                <p className="text-sm font-medium text-white/70">{tagline}</p>
              ) : null}
              {dog.bio ? (
                <p className="line-clamp-2 text-sm font-light text-white/85">
                  {dog.bio}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {/* Desktop copy column. Hidden below `md`, where the sticky bar carries the ask instead. */}
        <div className="hidden fill-mode-both animate-in fade-in slide-in-from-bottom-2 delay-150 duration-700 motion-reduce:animate-none md:flex md:max-w-md md:flex-col md:gap-5">
          {/* Same reason as the `h1` above: `lg:text-5xl` was resetting the
              leading to 1, and a long name makes this four lines. */}
          <h2 className="text-4xl font-extrabold leading-[1.1] text-text lg:text-5xl lg:leading-[1.05]">
            {invite}
          </h2>
          <p className="text-lg font-light text-subtitle">{nextStep}</p>
          <div className="mt-2 flex flex-col items-start gap-3">
            {/* /store is a route handler that UA-sniffs the request and redirects; it isn't a page for `Link` to prefetch or client-navigate to, which is why `store` is reported as "auto" rather than a named store. */}
            <DownloadCta
              href={storeHref}
              page="dog_share"
              placement="desktop_copy"
              store="auto"
              dogId={id}
              referral={referral}
              className="rounded-full bg-primary px-8 py-4 font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {ctaButton}
            </DownloadCta>
            <p className="text-sm font-light text-subtitle/80">
              {t("dog.cta.reassurance")}
            </p>
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA bar. `main`'s bottom padding above reserves room for it so it never covers the card. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-border bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_-15px_rgba(15,23,42,0.2)] backdrop-blur md:hidden">
        <p className="flex-1 truncate text-sm font-medium text-text">
          {mobileContext}
        </p>
        <DownloadCta
          href={storeHref}
          page="dog_share"
          placement="mobile_sticky_bar"
          store="auto"
          dogId={id}
          referral={referral}
          className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          {ctaButton}
        </DownloadCta>
      </div>
    </div>
  );
};
export default DogProfile;
