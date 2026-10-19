import type { StoreCampaign } from "@/app/store/store-urls";

import Link from "next/link";

import { DogPhoto } from "@/components/landing/dog-photo";
import { DECK, inLocale } from "@/components/landing/dogs";
import { StoreButtons } from "@/components/landing/store-buttons";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

/** How the cards under the top one sit: dropped, shrunk and tilted. */
const RESTING = [0, -3, 2.5].map((tilt, depth) => ({
  transform: `translate3d(0, ${depth * 12}px, 0) scale(${1 - depth * 0.045}) rotate(${tilt}deg)`,
}));

/**
 * Placeholder: a still stack of the deck. The hero section replaces it with
 * the swipeable deck (app physics, reactions, flip to the ID, the match).
 */
export const Hero = ({ campaign }: { campaign?: StoreCampaign }) => {
  const locale = getSafeLocale();
  const [top] = DECK;

  return (
    <section
      aria-labelledby="hero-title"
      className="overflow-hidden bg-field pb-12 text-ink lg:pb-10"
    >
      <div className="wrap grid gap-7 lg:max-h-[960px] lg:min-h-[calc(100svh-72px)] lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-4 pt-2 lg:gap-6 lg:pt-0">
          <h1 id="hero-title" className="text-balance text-display">
            {t("landing.hero.title")}
          </h1>
          <p className="max-w-[24em] text-balance text-lede">
            {t("landing.hero.description")}
          </p>
          <StoreButtons campaign={campaign} placement="hero" />
          <Link
            href={toLocalePath(locale, "/story")}
            className="inline-flex min-h-11 w-fit items-center font-bold underline decoration-2 underline-offset-[5px]"
          >
            {t("landing.hero.storyLink")}
          </Link>
        </div>

        <div className="relative mx-auto aspect-[0.7] w-[min(66vw,262px)] lg:w-[360px]">
          {DECK.map((dog, depth) => ({ dog, depth }))
            .reverse()
            .map(({ dog, depth }) => (
              <div
                key={dog.id}
                className="absolute inset-0 overflow-hidden rounded-card bg-[#1b1b1b] shadow-card"
                style={RESTING[depth]}
                aria-hidden={depth > 0}
              >
                <DogPhoto
                  dog={dog}
                  alt={depth === 0 ? inLocale(dog.alt, locale) : ""}
                  priority={depth === 0}
                  className="size-full object-cover"
                />
              </div>
            ))}
          {top ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-card text-white">
              <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/70 to-transparent" />
              {top.km === undefined ? null : (
                <span className="absolute left-3.5 top-3.5 rounded-xl bg-black/45 px-[11px] py-2 text-sm font-bold leading-none tabular-nums backdrop-blur-md">
                  {top.km} km
                </span>
              )}
              <div className="absolute inset-x-[18px] bottom-[18px]">
                <p className="text-[19px] leading-tight">
                  <b className="text-[22px] font-extrabold tracking-[-0.02em]">
                    {top.name}
                  </b>
                  , {inLocale(top.age, locale)}
                </p>
                {top.bio ? (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-white/90">
                    {inLocale(top.bio, locale)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
