import type { RadiusCopy } from "./radius-demo";

import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { RadiusDemo } from "./radius-demo";
import { RADIUS_DOGS } from "./radius-scale";

import b from "./landing.module.css";
import s from "./radius.module.css";

const FILTERS = ["breed", "size", "color", "age"] as const;

const countLine = (inside: number, total: number) => {
  if (inside === 0) return t("landing.radius.countNone");
  if (inside === total) return t("landing.radius.countAll", { n: inside });
  return t("landing.radius.countSome", { n: inside, total });
};

const readCopy = (): RadiusCopy => ({
  figLabel: t("landing.radius.figLabel"),
  you: t("landing.radius.you"),
  note: t("landing.radius.note"),
  maxDist: t("landing.radius.maxDist"),
  upTo: t("landing.radius.upTo", { km: "{km}" }),
  noLimit: t("landing.radius.noLimit"),
  counts: Array.from({ length: RADIUS_DOGS.length + 1 }, (_, inside) =>
    countLine(inside, RADIUS_DOGS.length),
  ),
});

export const Radius = () => (
  <section
    className={clsx(b.sec, s.ra)}
    data-nav="como-funciona"
    aria-labelledby="ra-title"
  >
    <div className={clsx(b.wrap, b.split, b["split-rev"])}>
      <div className={b["split-copy"]}>
        <h2 id="ra-title" className={b.h2} data-reveal="">
          {t("landing.radius.title")}
        </h2>
        <p className={b.desc} data-reveal="" style={cssVars({ "--d": "70ms" })}>
          {t("landing.radius.desc")}
        </p>
        <dl
          className={b.rows}
          data-reveal=""
          style={cssVars({ "--d": "140ms" })}
        >
          {FILTERS.map((filter) => (
            <div key={filter} className={b.row}>
              <dt>{t(`landing.radius.${filter}Key`)}</dt>
              <dd>{t(`landing.radius.${filter}Value`)}</dd>
            </div>
          ))}
        </dl>
        <p
          className={b.fine}
          data-reveal=""
          style={cssVars({ "--d": "210ms" })}
        >
          {t("landing.radius.fine")}
        </p>
      </div>
      <RadiusDemo
        className={clsx(b["split-object"], s["ra-stage"])}
        copy={readCopy()}
      />
    </div>
  </section>
);
