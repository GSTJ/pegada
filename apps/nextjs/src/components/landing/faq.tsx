import { clsx } from "clsx";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { FaqList } from "./faq-list";
import { rich } from "./rich";

import s from "./faq.module.css";
import b from "./landing.module.css";

const SUPPORT_EMAIL = "support@pegada.app";
const QUESTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

/** The inline links the FAQ copy can carry: the support inbox and the web deletion page. */
const linksTo = (deleteAccount: string) => ({
  mail: (text: string) => <a href={`mailto:${SUPPORT_EMAIL}`}>{text}</a>,
  web: (text: string) => <a href={deleteAccount}>{text}</a>,
});

export const Faq = () => {
  const links = linksTo(toLocalePath(getSafeLocale(), "/delete-account"));

  return (
    <section
      className={clsx(b.sec, s.fq)}
      id="perguntas"
      data-nav="perguntas"
      aria-labelledby="fq-title"
    >
      <div className={clsx(b.wrap, b.split, s["fq-grid"])}>
        <div className={s["fq-head"]}>
          <h2 id="fq-title" className={b.h2} data-reveal="">
            {t("landing.faq.title")}
          </h2>
          <p
            className={clsx(b.desc, s["fq-desc"])}
            data-reveal=""
            style={cssVars({ "--d": "70ms" })}
          >
            {rich(t("landing.faq.desc"), links)}
          </p>
        </div>
        <FaqList className={s["fq-list"]} style={cssVars({ "--d": "140ms" })}>
          {QUESTIONS.map((n) => (
            <details key={n} className={s.qa} name="faq" open={n === 1}>
              <summary>
                <h3 className={s["qa-q"]}>{t(`landing.faq.q${n}`)}</h3>
                <span className={s.plus} aria-hidden="true" />
              </summary>
              <div className={s["qa-a"]} data-answer="">
                <p>{rich(t(`landing.faq.a${n}`), links)}</p>
              </div>
            </details>
          ))}
        </FaqList>
      </div>
    </section>
  );
};
