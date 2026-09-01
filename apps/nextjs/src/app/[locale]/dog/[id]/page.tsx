import type { BreedSlug } from "@pegada/shared/i18n/i18n";
import type { Metadata } from "next";

import { preload } from "react-dom";

import { notFound } from "next/navigation";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { getFormattedYears } from "@pegada/shared/utils/get-formatted-years";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

import { getDog, getDogDescription, getDogImage } from "./get-dog";

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
  const title = t("dog.metadata.title", { name: dog.name });
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

  // This photo is the page: it is the LCP element on every /dog/[id] view, and
  // it is a CSS `background-image`, which the browser's preload scanner cannot
  // see. It is only discovered after the stylesheet has been fetched and the
  // rule has matched, so the request starts late no matter how fast the HTML
  // is. `preload` emits a hoisted `<link rel="preload" as="image">` in <head>,
  // which puts the fetch in the very first round of requests.
  //
  // Deliberately not `next/image`: this URL is on the media CDN and
  // `images.remotePatterns` is not configured, so switching would mean routing
  // user photos through the optimiser — a bigger change than an LCP fix needs.
  if (dogImage) {
    preload(dogImage, { as: "image", fetchPriority: "high" });
  }

  // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- server component: this renders once per request, there is no re-render to memoise against
  const dogImageStyle = { backgroundImage: `url(${dogImage})` };

  return (
    <div className="pt-8 md:pt-6 pb-12 space-y-8 md:space-y-4 flex flex-1 flex-col px-4 items-center min-h-screen">
      {/* oxlint-disable-next-line nextjs/no-img-element -- A static SVG needs no next/image pipeline. */}
      <img
        src="/logo.svg"
        draggable="false"
        alt=""
        className="h-12 select-none"
      />

      {/*
       * `aspect-[4/5]` is what makes this a tall hero on mobile, where it's
       * the only thing above the fold. On a laptop viewport that same ratio
       * pushes the CTA below the fold, so `md:h-[46vh]` gives it a fixed,
       * shorter height there instead (dropping the aspect ratio so it
       * doesn't fight that height) — width still comes from `w-full
       * max-w-xl`, so the card just reads a little wider/shorter.
       */}
      <div className="relative rounded-lg border border-border flex flex-col overflow-hidden w-full max-w-xl aspect-[4/5] md:aspect-auto md:h-[46vh]">
        <div style={dogImageStyle} className="flex flex-1 bg-cover bg-center">
          {Boolean(dog.breed?.name) && (
            <div className="border border-border/70 rounded-md p-2 py-1 m-4 bg-background/50 backdrop-blur ml-auto mb-auto font-semibold">
              {t(`${dog.breed?.slug as BreedSlug}`, { ns: Namespace.Breed })}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 left-0 bg-background/50 backdrop-blur flex flex-col items-center justify-center p-8 border-t border-t-border/70 text-center">
          <p className="text-xl text-text">
            <b>{dog.name}</b>
            {dog?.birthDate
              ? `, ${getFormattedYears({ birthDate: dog?.birthDate, lng })}`
              : null}
          </p>
          <p>{dog.bio}</p>
        </div>
      </div>

      <div className="w-full max-w-xl bg-secondary rounded-lg border border-border/70 flex flex-col items-center gap-4 md:gap-3 p-8 md:p-6 text-center">
        <h2 className="text-3xl md:text-2xl font-extrabold text-text">
          {t("dog.cta.title")}
        </h2>
        <p className="text-subtitle">{t("dog.cta.description")}</p>
        {/* oxlint-disable-next-line next/no-html-link-for-pages -- /store is a route handler that UA-sniffs the request and redirects; it isn't a page for `Link` to prefetch or client-navigate to. */}
        <a
          href="/store"
          className="bg-primary text-white font-semibold rounded-full px-8 py-4 md:px-6 md:py-3 hover:scale-105 transition-transform duration-200 ease-in-out"
        >
          {t("dog.cta.button")}
        </a>
      </div>
    </div>
  );
};
export default DogProfile;
