/* oxlint-disable nextjs/no-img-element -- the screenshot is a pre-sized WebP pair served from /public, so next/image adds nothing. */
import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { CURVINHA_APP_STORE_URL, CURVINHA_SITE_URL } from "./curvinha-urls";

import s from "./curvinha.module.css";
import b from "./landing.module.css";

/** "card": wide card, copy left, phone cropped by the bottom edge. "centered": compact, icon on top, phone peeking below. */
const LAYOUT: "card" | "centered" = "card";

/** Cross-promo for Curvinha, the maker's other app. Sits below the closing CTA, so it stays smaller than it. */
export const Curvinha = () => (
  <section className={s.sec} aria-labelledby="curvinha-title">
    <div className={b.wrap}>
      <div className={s.card} data-layout={LAYOUT} data-reveal="">
        <div className={s.copy}>
          <img
            className={s.icon}
            src="/curvinha/icon.png"
            alt=""
            width={256}
            height={256}
            loading="lazy"
          />
          <p className={s.kicker}>{t("landing.curvinha.kicker")}</p>
          <h2 id="curvinha-title" className={s.title}>
            {t("landing.curvinha.title")}
          </h2>
          <p className={s.desc}>{t("landing.curvinha.desc")}</p>
          <div className={s.actions}>
            <a
              className={clsx(b.store, s.store)}
              href={CURVINHA_APP_STORE_URL}
              aria-label={t("landing.curvinha.storeLabel")}
            >
              <span
                className={clsx(b["store-icon"], b.apple)}
                aria-hidden="true"
              />
              <span className={b["store-txt"]}>
                <small>{t("landing.chrome.appStorePre")}</small>App Store
              </span>
            </a>
            <a className={s.link} href={CURVINHA_SITE_URL}>
              {t("landing.curvinha.link")}
            </a>
          </div>
        </div>
        <div
          className={s.stage}
          data-reveal=""
          style={cssVars({ "--d": "140ms" })}
        >
          <div className={s.phone}>
            <img
              className={s.mascot}
              src="/curvinha/mascot.svg"
              alt=""
              width={92}
              height={92}
              loading="lazy"
              aria-hidden="true"
            />
            <img
              className={s.shot}
              src="/curvinha/proposal-300.webp"
              srcSet="/curvinha/proposal-300.webp 300w, /curvinha/proposal-600.webp 600w"
              sizes="264px"
              alt={t("landing.curvinha.shotAlt")}
              width={300}
              height={652}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
);
