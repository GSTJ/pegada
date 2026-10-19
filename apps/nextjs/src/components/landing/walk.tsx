import type { CSSProperties } from "react";

import { Fragment } from "react";

import { Namespace } from "@pegada/shared/i18n/types/types";

import { DOGS } from "@/components/landing/dogs";
import { PawPrint } from "@/components/landing/paw-print";
import { SCREENS } from "@/components/landing/walk-screens";
import {
  DESKTOP_STAMP,
  DESKTOP_TRAIL,
  PHONE_STAMP,
  PHONE_TRAIL,
} from "@/components/landing/walk-trail";
import { t } from "@/lib/translate";

import styles from "@/components/landing/walk.module.css";

const STEPS = ["profile", "swipe", "match", "chat"] as const;

const place = (foot: { t: number; c: number; delay: number; turn?: number }) =>
  ({
    "--t": foot.t,
    "--c": foot.c,
    "--delay": `${foot.delay}ms`,
    "--turn": foot.turn === undefined ? undefined : `${foot.turn}deg`,
  }) as CSSProperties;

const Rail = ({ step }: { step: number }) => {
  const trails = [
    ["phone", PHONE_TRAIL[step], { ...PHONE_STAMP, box: "band", c: 0 }],
    ["desktop", DESKTOP_TRAIL[step], { ...DESKTOP_STAMP, c: 0 }],
  ] as const;

  return (
    <div className={styles.rail} aria-hidden>
      {trails.map(([on, feet, stamp]) => (
        <Fragment key={on}>
          {feet?.map((foot) => (
            <span
              key={`${foot.box}${foot.t}${foot.c}`}
              className={styles.foot}
              data-on={on}
              data-box={foot.box}
              data-kind={foot.kind}
              style={place(foot)}
            >
              <PawPrint pressed={foot.kind !== "ink"} />
            </span>
          ))}
          {step === 2 && (
            <>
              <span
                className={styles.stamp}
                data-on={on}
                data-box={"box" in stamp ? stamp.box : undefined}
                style={place(stamp)}
              >
                <PawPrint />
              </span>
              <span
                className={styles.together}
                data-on={on}
                data-box={"box" in stamp ? stamp.box : undefined}
                style={place(stamp)}
              >
                {t("landing.walk.together")}
              </span>
            </>
          )}
        </Fragment>
      ))}
    </div>
  );
};

/** The four steps on two trails that meet at the match, then who gets to talk. */
export const Walk = () => {
  const { name } = DOGS.lua;
  const app = { ns: Namespace.Translation } as const;

  return (
    <section
      id="walk"
      aria-labelledby="walk-title"
      data-reveal
      className="overflow-clip bg-blush py-section"
    >
      <div className="wrap">
        <h2
          id="walk-title"
          data-role="title"
          className="max-w-[40rem] text-balance text-title"
        >
          {t("landing.walk.title")}
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((key, index) => {
            const Screen = SCREENS[key];
            return (
              <li key={key} data-reveal className={styles.step}>
                <Rail step={index} />
                <div className={styles.copy}>
                  <h3
                    data-role="title"
                    className="text-[22px] font-bold leading-tight tracking-[-0.02em]"
                  >
                    {t(`landing.walk.steps.${key}.title`)}
                  </h3>
                  <p data-role="lede" className="mt-1.5 text-ink-muted">
                    {t(`landing.walk.steps.${key}.description`)}
                  </p>
                </div>
                <div
                  data-role="card"
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the screen is rebuilt in HTML, so one label stands in for the whole picture.
                  role="img"
                  aria-label={t(`landing.walk.steps.${key}.alt`)}
                  className={styles.print}
                >
                  <div className={styles.screen} aria-hidden>
                    <Screen />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div data-reveal className={styles.rules}>
          <div className="grid gap-[18px]">
            <h3
              data-role="title"
              className="text-balance text-[clamp(1.875rem,1.4vw+1.375rem,2.75rem)] font-extrabold leading-none tracking-[-0.03em]"
            >
              {t("landing.walk.rules.title")}
            </h3>
            <p data-role="lede" className="max-w-[30em] text-lg text-ink-muted">
              {t("landing.walk.rules.description")}
            </p>
          </div>
          <figure data-role="card" className={styles.actions}>
            <ul>
              <li data-tone="pink">{t("dogProfile.unmatch", app)}</li>
              <li data-tone="pink">
                {t("dogProfile.shareProfile", { ...app, name })}
              </li>
              <li>{t("dogProfile.reportName", { ...app, name })}</li>
            </ul>
            <figcaption>{t("landing.walk.rules.where")}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
};
