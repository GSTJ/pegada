import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import breedNames from "@pegada/shared/i18n/locales/en/breed.json";
import { Namespace } from "@pegada/shared/i18n/types/types";

import { t } from "@/lib/translate";

import { BreedsFinder } from "./breeds-finder";

import styles from "./breeds.module.css";

/**
 * The app's breed picker, in its own order: the picker lists `breed.findMany()`
 * unsorted, which is the seed's insert order, and the locale files keep the
 * same keys in the same order. Only the keys are read here.
 */
const BREEDS = Object.keys(breedNames) as BreedSlug[];

const breedName = (slug: BreedSlug) => t(slug, { ns: Namespace.Breed });

export const Breeds = () => (
  <section
    id="breeds"
    aria-labelledby="breeds-title"
    data-reveal
    className="bg-yellow py-section text-navy [color-scheme:light]"
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
        <p data-role="lede" className="text-lede">
          {t("landing.breeds.description")}
        </p>
      </div>
      <div className="mt-12">
        {/* The finder fills the placeholders in as the visitor types. */}
        <BreedsFinder
          label={t("landing.breeds.finder.label")}
          placeholder={t("landing.breeds.finder.placeholder")}
          foundOne={t("landing.breeds.finder.foundOne", { n: "{{n}}" })}
          foundMany={t("landing.breeds.finder.foundMany", { n: "{{n}}" })}
          none={t("landing.breeds.finder.none", { query: "{{query}}" })}
        >
          <ul data-role="body" className={styles.wall}>
            {BREEDS.map((slug) => (
              <li
                key={slug}
                data-slug={slug}
                data-mark={slug === "mixed-breed" || undefined}
              >
                <span className={styles.name}>{breedName(slug)}</span>
              </li>
            ))}
          </ul>
        </BreedsFinder>
      </div>
      <p data-role="action" className={styles.caption}>
        {t("landing.breeds.caption", {
          total: BREEDS.length,
          mixed: breedName("mixed-breed"),
        })}
      </p>
    </div>
  </section>
);
