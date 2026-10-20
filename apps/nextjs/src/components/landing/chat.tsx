import type { ChatCopy } from "./chat-demo";

import { clsx } from "clsx";

import { t } from "@/lib/translate";

import { ChatDemo } from "./chat-demo";
import { cssVars } from "./css-vars";

import s from "./chat.module.css";
import b from "./landing.module.css";

const FACTS = ["onlyAfter", "unmatch", "report"] as const;

const readCopy = (): ChatCopy => ({
  screenLabel: t("landing.chat.screenLabel"),
  matched: t("landing.chat.matched"),
  start: t("landing.chat.start"),
  today: t("landing.chat.today"),
  messages: [
    { side: "sent", text: t("landing.chat.m1"), time: "9:32" },
    { side: "got", text: t("landing.chat.m2"), time: "9:34" },
    { side: "sent", text: t("landing.chat.m3"), time: "9:35" },
    { side: "got", text: t("landing.chat.m4"), time: "9:38" },
  ],
  typeMessage: t("landing.chat.typeMessage"),
  caption: t("landing.chat.caption"),
  playAgain: t("landing.chat.playAgain"),
});

export const Chat = () => (
  <section
    className={clsx(b.sec, s.cv)}
    data-nav="como-funciona"
    aria-labelledby="cv-title"
  >
    <div className={clsx(b.wrap, b.split)}>
      <div className={b["split-copy"]}>
        <h2 id="cv-title" className={b.h2} data-reveal="">
          {t("landing.chat.title")}
        </h2>
        <p className={b.desc} data-reveal="" style={cssVars({ "--d": "70ms" })}>
          {t("landing.chat.desc")}
        </p>
        <dl
          className={b.rows}
          data-reveal=""
          style={cssVars({ "--d": "140ms" })}
        >
          {FACTS.map((fact) => (
            <div key={fact} className={b.row}>
              <dt>{t(`landing.chat.${fact}Key`)}</dt>
              <dd>{t(`landing.chat.${fact}Value`)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <ChatDemo
        className={clsx(b["split-object"], s["cv-object"])}
        copy={readCopy()}
      />
    </div>
  </section>
);
