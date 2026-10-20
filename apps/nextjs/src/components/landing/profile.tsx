/* oxlint-disable nextjs/no-img-element -- a pre-sized WebP, lazy; next/image would add a client component for nothing. */
import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { Fragment } from "react";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { ProfileBuild } from "./profile-build";
import { rich } from "./rich";
import { StatusBar } from "./status-bar";

import b from "./landing.module.css";
import s from "./profile.module.css";

const breed = (slug: BreedSlug) =>
  t<Namespace.Breed>(slug, { ns: Namespace.Breed });

/** The breeds the pill rolls through before it lands on Lua's. */
const ROLL = [
  "mixed-breed",
  "beagle",
  "labrador",
  "shih-tzu",
  "german-shepherd",
  "border-collie",
] as const satisfies readonly BreedSlug[];

const BOLD = { b: (text: string) => <b>{text}</b> };

const FACTS = [
  { key: "foto", label: "photos" },
  { key: "nome", label: "name" },
  { key: "idade", label: "birthday" },
  { key: "raca", label: "breed" },
  { key: "bio", label: "bio" },
] as const;

export const Profile = () => {
  const bioWords: string[] = t("landing.profile.luaBio").split(" ");

  return (
    // oxlint-disable-next-line react-perf/jsx-no-new-array-as-prop -- a server component renders once per request; there is no re-render to save.
    <ProfileBuild className={clsx(b.sec, s.pf)} roll={ROLL.map(breed)}>
      <div className={clsx(b.wrap, b.split)}>
        <div className={b["split-copy"]}>
          <h2 id="pf-title" className={b.h2} data-reveal="">
            {t("landing.profile.title")}
          </h2>
          <p
            className={b.desc}
            data-reveal=""
            style={cssVars({ "--d": "70ms" })}
          >
            {t("landing.profile.desc")}
          </p>
          <dl
            className={clsx(b.rows, s["pf-sync"])}
            data-reveal=""
            style={cssVars({ "--d": "140ms" })}
          >
            {FACTS.map(({ key, label }) => (
              <div key={key} className={clsx(b.row, s.row)} data-k={key}>
                <dt>
                  <i className={s.mark} aria-hidden="true" />
                  <span>{t(`landing.profile.${label}Key`)}</span>
                </dt>
                <dd>{rich(t(`landing.profile.${label}Value`), BOLD)}</dd>
              </div>
            ))}
          </dl>
          <p
            className={b.fine}
            data-reveal=""
            style={cssVars({ "--d": "210ms" })}
          >
            {t("landing.profile.fine")}
          </p>
          <button
            className={clsx(b.btn, b["btn-line"], s["pf-replay"])}
            type="button"
            data-replay=""
            data-reveal=""
            style={cssVars({ "--d": "260ms" })}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path
                d="M3.8 10a6.2 6.2 0 1 0 1.9-4.5M3.6 2.9v3.4H7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{t("landing.profile.replay")}</span>
          </button>
        </div>

        <div
          className={clsx(b["split-object"], s["pf-stage"])}
          data-stage=""
          data-reveal=""
          style={cssVars({ "--d": "120ms" })}
        >
          <div className={b.phone}>
            <div
              className={clsx(b.screen, s["pf-screen"])}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a screen drawn from many elements, read as one picture with one name.
              role="img"
              aria-label={t("landing.profile.screenLabel")}
            >
              <div className={s.pv} data-build="">
                <div className={s["pv-photo"]} data-a="foto">
                  <img
                    src="/landing/lua.webp"
                    alt=""
                    width={720}
                    height={1028}
                    loading="lazy"
                  />
                </div>
                <StatusBar className={b["sb-over"]} />
                <span className={s["pv-chev"]} data-a="tail">
                  <svg viewBox="0 0 24 24">
                    <path
                      d="m6 9.5 6 5.5 6-5.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div className={s["pv-body"]}>
                  <span className={s["pv-breed"]} data-a="raca">
                    <span className={s.tx} data-roll="">
                      {breed("border-collie")}
                    </span>
                  </span>
                  <p className={clsx(s["pv-name"], s.nm)}>
                    <b className={s.tx} data-a="nome" data-type="">
                      Lua
                    </b>
                    <span className={s.age} data-a="idade">
                      {", "}
                      <span className={s["age-box"]}>
                        <span className={s["age-date"]}>
                          {t("landing.profile.luaBirthday")}
                        </span>
                        <span className={clsx(s["age-val"], s.tx)}>
                          {t("landing.profile.luaAge")}
                        </span>
                      </span>
                    </span>
                  </p>
                  <p className={s["pv-bio"]}>
                    <span className={s.tx} data-a="bio" data-words="">
                      {bioWords.map((word, index) => (
                        // oxlint-disable-next-line react/no-array-index-key -- the words of a fixed sentence; their order is their identity.
                        <Fragment key={index}>
                          {index ? " " : null}
                          <span
                            className={s.w}
                            style={cssVars({ "--i": index })}
                          >
                            {word}
                          </span>
                        </Fragment>
                      ))}
                    </span>
                  </p>
                  <p className={s["pv-share"]} data-a="tail">
                    {t("landing.profile.luaShare")}
                  </p>
                  <p className={s["pv-report"]} data-a="tail">
                    {t("landing.profile.luaReport")}
                  </p>
                </div>
                <div className={clsx(s.rx, s["pv-rx"])} data-a="tail">
                  <span className={s.lg}>
                    <i>😕</i>
                  </span>
                  <span className={s.sm}>
                    <i>🤔</i>
                  </span>
                  <span className={s.lg}>
                    <i>😍</i>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProfileBuild>
  );
};
