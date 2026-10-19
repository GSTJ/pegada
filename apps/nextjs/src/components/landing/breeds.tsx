import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import breedNames from "@pegada/shared/i18n/locales/en/breed.json";
import { Namespace } from "@pegada/shared/i18n/types/types";

import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

/** The app's breed picker, in its own order. Only the keys are read here. */
const BREEDS = Object.keys(breedNames) as BreedSlug[];

/** Placeholder: the full breed list with Mixed Breed marked. */
export const Breeds = () => (
  <section
    id="breeds"
    aria-labelledby="breeds-title"
    data-reveal
    className="bg-yellow py-section text-navy"
  >
    <div className="wrap">
      <div className="grid max-w-[40rem] gap-[18px]">
        <h2
          id="breeds-title"
          data-role="title"
          className="text-balance text-title"
        >
          {t("landing.breeds.title")}
        </h2>
        <p data-role="lede" className="text-lg">
          {t("landing.breeds.description")}
        </p>
      </div>
      <ul
        data-role="body"
        className="mt-12 flex flex-wrap gap-x-[0.5em] text-[clamp(1.375rem,1.6vw+0.875rem,2.5rem)] font-extrabold leading-[1.22] tracking-[-0.025em]"
      >
        {BREEDS.map((slug) => (
          <li
            key={slug}
            className={cn(
              "whitespace-nowrap",
              slug === "mixed-breed" && "bg-pink px-[0.12em]",
            )}
          >
            {t(slug, { ns: Namespace.Breed })}
          </li>
        ))}
      </ul>
      <p data-role="action" className="mt-7 max-w-[34em] text-[15px]">
        {t("landing.breeds.caption")}
      </p>
    </div>
  </section>
);
