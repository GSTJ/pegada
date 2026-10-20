/* oxlint-disable nextjs/no-img-element -- the photos are pre-sized AVIF/WebP pairs in <picture>, which next/image cannot express; the rest are small fixed assets. */
import type { StoreCampaign } from "@/app/store/store-urls";

import { preload } from "react-dom";

import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { HeroFan } from "./hero-fan";
import { StoreButtons } from "./store-buttons";

import s from "./hero.module.css";
import b from "./landing.module.css";

/** Lua and Nina, the two cards of the Match; Nina, in front, is the LCP. */
const CARDS = [
  { dog: "lua", className: s["mcard-back"], depth: -4 },
  { dog: "nina", className: s["mcard-front"], depth: 7 },
] as const;

export const Hero = ({ campaign }: { campaign?: StoreCampaign }) => {
  // React never hoists a preload for an <img> inside <picture>, so the AVIF
  // the browser will pick is announced by hand.
  for (const { dog } of CARDS) {
    preload(`/landing/${dog}.avif`, {
      as: "image",
      type: "image/avif",
      fetchPriority: "high",
    });
  }

  return (
    <section className={s.hero} id="topo" aria-labelledby="hero-title">
      <div className={clsx(b.wrap, s["hero-grid"])}>
        <h1
          id="hero-title"
          className={clsx(b.h1, s["hero-title"])}
          data-in=""
          style={cssVars({ "--d": "0ms" })}
        >
          {t("landing.hero.title")}
        </h1>
        <p
          className={clsx(b.lede, s["hero-lede"])}
          data-in=""
          style={cssVars({ "--d": "50ms" })}
        >
          {t("landing.hero.lede")}
        </p>
        <StoreButtons
          className={s["hero-stores"]}
          page="landing"
          placement="hero"
          campaign={campaign}
          data-in=""
          style={cssVars({ "--d": "100ms" })}
        />

        <figure className={s.moment} aria-label={t("landing.hero.figLabel")}>
          <HeroFan className={s.fan}>
            {CARDS.map(({ dog, className, depth }) => (
              <div
                key={dog}
                className={clsx(s.mcard, className)}
                style={cssVars({ "--depth": depth })}
              >
                <picture>
                  <source srcSet={`/landing/${dog}.avif`} type="image/avif" />
                  <img
                    src={`/landing/${dog}.webp`}
                    alt=""
                    width={720}
                    height={1028}
                    fetchPriority="high"
                  />
                </picture>
              </div>
            ))}
          </HeroFan>
          <div className={s.badge} aria-hidden="true">
            <img
              src="/landing/heart-eyes.webp"
              alt=""
              width={334}
              height={334}
            />
          </div>
          <figcaption className={s["match-text"]}>
            <span className={s.got}>{t("landing.hero.youGotA")}</span>
            <img
              className={s.wordmark}
              src="/landing/match.svg"
              alt="Match"
              width={2724}
              height={882}
            />
            <span className={s.liked}>{t("landing.hero.likedNina")}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
};
