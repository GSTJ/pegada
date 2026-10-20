/* oxlint-disable nextjs/no-img-element -- the story art is a pre-sized WebP, lazy; next/image adds a loader for nothing here. */
import { clsx } from "clsx";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { toLocalePath } from "@/lib/locales";
import { t } from "@/lib/translate";

import { cssVars } from "./css-vars";
import { rich } from "./rich";
import { StatusBar } from "./status-bar";
import { StoryPhone } from "./story-phone";

import b from "./landing.module.css";
import s from "./story.module.css";

const BOLD = { b: (text: string) => <b>{text}</b> };

export const Story = () => (
  <section
    className={b.sec}
    data-nav="como-funciona"
    aria-labelledby="st-title"
  >
    <div className={clsx(b.wrap, b.split, b["split-rev"])}>
      <div className={b["split-copy"]}>
        <h2 id="st-title" className={b.h2} data-reveal="">
          {t("landing.story.title")}
        </h2>
        <p className={b.desc} data-reveal="" style={cssVars({ "--d": "70ms" })}>
          {rich(t("landing.story.desc"), BOLD)}
        </p>
        <p
          className={b.fine}
          data-reveal=""
          style={cssVars({ "--d": "140ms" })}
        >
          {t("landing.story.note")}
        </p>
        <a
          className={s.more}
          href={toLocalePath(getSafeLocale(), "/story")}
          data-reveal=""
          style={cssVars({ "--d": "210ms" })}
        >
          <span>{t("landing.story.more")}</span>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M3 8h9.5M8.5 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      <figure
        className={clsx(b["split-object"], s["st-object"])}
        data-reveal=""
        style={cssVars({ "--d": "120ms" })}
      >
        <StoryPhone
          className={clsx(b.phone, s["st-phone"])}
          label={t("landing.story.phoneLabel")}
        >
          <div className={clsx(b.screen, s.ig)}>
            <StatusBar className={b["sb-dark"]} />
            <div className={s["ig-art"]}>
              <img
                src="/story/dm-aberta.webp"
                alt=""
                width={900}
                height={1600}
                loading="lazy"
                decoding="async"
              />
              <div className={s["ig-top"]} aria-hidden="true">
                <span className={s["ig-bar"]}>
                  <i data-bar="" />
                </span>
              </div>
            </div>
            <div className={s["ig-reply"]} aria-hidden="true">
              <span className={s["ig-field"]}>{t("landing.story.reply")}</span>
              <svg viewBox="0 0 24 24" width="21" height="21">
                <path
                  d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.3a4.4 4.4 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
              </svg>
              <svg viewBox="0 0 24 24" width="21" height="21">
                <path
                  d="M20.5 3.5 10.6 13.4M20.5 3.5 14.2 20.5l-3.6-7.1-7.1-3.6Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </StoryPhone>
        <figcaption className={b.cap}>{t("landing.story.caption")}</figcaption>
      </figure>
    </div>
  </section>
);
