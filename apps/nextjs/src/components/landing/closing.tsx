/* oxlint-disable nextjs/no-img-element -- the photos are pre-sized AVIF/WebP pairs in <picture>, which next/image cannot express. */
import type { StoreCampaign } from "@/app/store/store-urls";

import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { StoreButtons } from "./store-buttons";

import s from "./closing.module.css";
import b from "./landing.module.css";

const CARDS = [
  { dog: "lua", className: s["ef-back"] },
  { dog: "nina", className: s["ef-front"] },
] as const;

export const Closing = ({ campaign }: { campaign?: StoreCampaign }) => (
  <section className={s["end-sec"]} aria-labelledby="end-title">
    <div className={b.wrap}>
      <div className={clsx(b.well, s.end)} id="baixar">
        <div className={s.ef} data-reveal="" aria-hidden="true">
          {CARDS.map(({ dog, className }) => (
            <div key={dog} className={clsx(s["ef-card"], className)}>
              <picture>
                <source srcSet={`/landing/${dog}.avif`} type="image/avif" />
                <img
                  src={`/landing/${dog}.webp`}
                  alt=""
                  width={720}
                  height={1028}
                  loading="lazy"
                />
              </picture>
            </div>
          ))}
          <span className={s["ef-badge"]}>
            <img
              src="/landing/heart-eyes.webp"
              alt=""
              width={334}
              height={334}
              loading="lazy"
            />
          </span>
        </div>
        <h2
          id="end-title"
          className={clsx(b.h2, s["end-h"])}
          data-reveal=""
          style={cssVars({ "--d": "70ms" })}
        >
          {t("landing.closing.title")}
        </h2>
        <p
          className={b.desc}
          data-reveal=""
          style={cssVars({ "--d": "140ms" })}
        >
          {t("landing.closing.desc")}
        </p>
        <StoreButtons
          className={s["end-stores"]}
          page="landing"
          placement="closing"
          campaign={campaign}
          data-reveal=""
          style={cssVars({ "--d": "210ms" })}
        />
      </div>
    </div>
  </section>
);
