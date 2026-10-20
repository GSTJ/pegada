import type { DeckCopy, DeckDog } from "./deck-demo";

import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { DeckDemo } from "./deck-demo";
import { rich } from "./rich";

import s from "./deck.module.css";
import b from "./landing.module.css";

const KEYCAP = { kbd: (text: string) => <kbd>{text}</kbd> };

/** Lua is your dog, so she is never in the deck. Nina is the hero's match. */
const DOGS = [
  { id: "nina", name: "Nina", dist: "3km", likedYou: true },
  { id: "tofu", name: "Tofu", dist: "2km", likedYou: false },
  { id: "mel", name: "Mel", dist: "5km", likedYou: false },
  { id: "bento", name: "Bento", dist: "12km", likedYou: false },
  { id: "pipoca", name: "Pipoca", dist: "8km", likedYou: false },
  { id: "maui", name: "Maui", dist: "246km", likedYou: false },
] as const;

const readDogs = (): DeckDog[] =>
  DOGS.map(({ id, name, dist, likedYou }) => {
    const age = t(`landing.deck.${id}.age`);
    return {
      id,
      name,
      dist,
      likedYou,
      age,
      bio: id === "nina" ? t("landing.deck.nina.bio") : undefined,
      alt: t(`landing.deck.${id}.alt`),
      said: {
        nope: t(`landing.deck.${id}.nope`),
        maybe: t(`landing.deck.${id}.maybe`),
        like: t(`landing.deck.${id}.like`),
      },
      now: t("landing.deck.now", { name, age, dist }),
      back: t("landing.deck.back", { name, age }),
    };
  });

const readCopy = (): DeckCopy => ({
  answers: {
    maybe: {
      title: t("landing.deck.maybe"),
      desc: t("landing.deck.maybeDesc"),
      keyLabel: t("landing.deck.keyUp"),
    },
    nope: {
      title: t("landing.deck.nope"),
      desc: t("landing.deck.nopeDesc"),
      keyLabel: t("landing.deck.keyLeft"),
    },
    like: {
      title: t("landing.deck.like"),
      desc: t("landing.deck.likeDesc"),
      keyLabel: t("landing.deck.keyRight"),
    },
  },
  deckRole: t("landing.deck.deckRole"),
  deckLabel: t("landing.deck.deckLabel"),
  emptyTitle: t("landing.deck.emptyTitle"),
  emptyDesc: t("landing.deck.emptyDesc"),
  seeAgain: t("landing.deck.seeAgain"),
  youGotA: t("landing.hero.youGotA"),
  likedNina: t("landing.hero.likedNina"),
  sendMessage: t("landing.deck.sendMessage"),
  keepSwiping: t("landing.deck.keepSwiping"),
  demoNote: t("landing.deck.demoNote"),
  upTop: t("landing.deck.upTop"),
  matchLive: t("landing.deck.matchLive"),
  none: t("landing.deck.none"),
});

export const Deck = () => (
  <section
    className={clsx(b.sec, s.dk)}
    data-nav="como-funciona"
    aria-labelledby="dk-title"
  >
    <div className={b.wrap}>
      <div className={b["head-c"]}>
        <h2 id="dk-title" className={b.h2} data-reveal="">
          {t("landing.deck.title")}
        </h2>
        <p className={b.desc} data-reveal="" style={cssVars({ "--d": "70ms" })}>
          {t("landing.deck.desc")}
        </p>
      </div>
      <DeckDemo dogs={readDogs()} copy={readCopy()} />
      <p className={s["dk-hint"]}>
        <span className={s["hint-fine"]}>
          {rich(t("landing.deck.hintFine"), KEYCAP)}
        </span>
        <span className={s["hint-touch"]}>{t("landing.deck.hintTouch")}</span>
      </p>
    </div>
  </section>
);
