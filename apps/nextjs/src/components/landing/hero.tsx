import type { StoreCampaign } from "@/app/store/store-urls";
import type { DeckCopy } from "@/components/landing/hero-deck";

import Link from "next/link";

import { Namespace } from "@pegada/shared/i18n/types/types";

import { DECK, DOGS, inLocale } from "@/components/landing/dogs";
import { HeroDeck } from "@/components/landing/hero-deck";
import { IdCard } from "@/components/landing/id-card";
import { StoreButtons } from "@/components/landing/store-buttons";
import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

import styles from "./hero.module.css";

/** The app's own strings, so the match and the empty deck read as in the app. */
const app = (key: Parameters<typeof t<Namespace.Translation>>[0], name = "") =>
  t(key, { ns: Namespace.Translation, name });

export const Hero = ({ campaign }: { campaign?: StoreCampaign }) => {
  const locale = getSafeLocale();

  // oxlint-disable-next-line react-perf/jsx-no-new-object-as-prop -- a server component renders once; the deck gets its strings already interpolated.
  const copy: DeckCopy = {
    label: t("landing.hero.deckLabel"),
    roleDescription: t("landing.hero.deckRole"),
    keys: t("landing.hero.deckKeys"),
    hint: t("landing.hero.hint"),
    note: t("landing.hero.note"),
    skip: t("landing.hero.skip"),
    maybe: t("landing.hero.maybe"),
    like: t("landing.hero.like"),
    yourDog: t("landing.hero.yourDog"),
    youGotA: app("newMatch.youGotA"),
    matchCaption: app("newMatch.youLikedEachOther", DOGS.nina.name),
    sendMessage: app("newMatch.sendMessage"),
    keepSwiping: app("newMatch.keepSwiping"),
    emptyTitle: app("swipeRequestFeedback.emptyTitle"),
    emptyDescription: app("swipeRequestFeedback.emptyDescription"),
    preferences: app("swipeRequestFeedback.preferencesLink"),
    reshuffle: t("landing.hero.reshuffle"),
    shuffled: t("landing.hero.shuffled"),
    dogs: Object.fromEntries(
      DECK.map(({ id, name, age, km }) => [
        id,
        {
          label: [
            `${name}, ${inLocale(age, locale)}`,
            ...(km === undefined ? [] : [t("landing.hero.away", { km })]),
          ].join(", "),
          skipped: t("landing.hero.skipped", { name }),
          maybed: t("landing.hero.maybed", { name }),
          liked: t("landing.hero.liked", { name }),
          profile: t("landing.hero.profile", { name }),
          photo: t("landing.hero.photo", { name }),
        },
      ]),
    ),
  };

  return (
    <section
      aria-labelledby="hero-title"
      className="overflow-hidden bg-field pb-12 text-ink lg:pb-10"
    >
      <div
        className={cn(
          "wrap lg:max-h-[960px] lg:min-h-[calc(100svh-72px)]",
          styles.grid,
        )}
      >
        <div className={styles.copy}>
          <h1 id="hero-title" className="text-balance text-display">
            {t("landing.hero.title")}
          </h1>
          <p className="max-w-[24em] text-balance text-lede">
            {t("landing.hero.description")}
          </p>
          <StoreButtons campaign={campaign} placement="hero" />
        </div>

        <HeroDeck
          locale={locale}
          copy={copy}
          backs={Object.fromEntries(
            DECK.map((dog) => [
              dog.id,
              <IdCard key={dog.id} dog={dog} orientation="portrait" />,
            ]),
          )}
        />

        <Link
          href={toLocalePath(locale, "/story")}
          className={cn(
            "inline-flex min-h-11 w-fit items-center font-bold underline decoration-2 underline-offset-[5px]",
            styles.story,
          )}
        >
          {t("landing.hero.storyLink")}
        </Link>
      </div>
    </section>
  );
};
