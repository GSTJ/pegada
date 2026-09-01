import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { Namespace } from "@pegada/shared/i18n/types/types";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import { gilroy } from "./fonts";
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
};

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

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "profile" },
    twitter: { card: "summary_large_image" },
  };
};

const DogProfile = async ({ params }: DogProfileProps) => {
  const { id } = await params;
  const dog = await getDog(id);
  const lng = getSafeLocale();

  if (!dog) {
    return notFound();
  }

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
              // Mirrors the app's own breed tag (`breed-tag.tsx` +
              // `Glassmorphism`): a frosted, bordered pill, not an uppercase
              // dark badge — same casing, same md radius, same light glass
              // tint the app uses over photos.
              <div className="absolute right-4 top-4 flex h-8 items-center rounded-xl border border-white/30 bg-white/20 px-3 leading-none text-white backdrop-blur-md">
                <span className="text-sm font-medium">
                  {t(`${dog.breed?.slug as BreedSlug}`, {
                    ns: Namespace.Breed,
                  })}
                </span>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-5 pb-5 pt-16">
              <h1 className="text-2xl font-extrabold leading-tight text-white md:text-3xl">
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
          <h2 className="text-4xl font-extrabold leading-tight text-text lg:text-5xl">
            {invite}
          </h2>
          <p className="text-lg font-light text-subtitle">{nextStep}</p>
          <div className="mt-2 flex flex-col items-start gap-3">
            {/* oxlint-disable-next-line next/no-html-link-for-pages -- /store is a route handler that UA-sniffs the request and redirects; it isn't a page for `Link` to prefetch or client-navigate to. */}
            <a
              href="/store"
              className="rounded-full bg-primary px-8 py-4 font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              {ctaButton}
            </a>
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
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- /store is a route handler that UA-sniffs the request and redirects; it isn't a page for `Link` to prefetch or client-navigate to. */}
        <a
          href="/store"
          className="shrink-0 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-transform duration-200 ease-in-out hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          {ctaButton}
        </a>
      </div>
    </div>
  );
};
export default DogProfile;
