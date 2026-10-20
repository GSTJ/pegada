"use client";

/* oxlint-disable nextjs/no-img-element -- a 2KB pre-sized avatar; next/image adds a loader for nothing here. */
import { useEffect, useRef, useState } from "react";

import { clsx } from "clsx";

import { cssVars } from "./css-vars";
import { StatusBar } from "./status-bar";
import { prefersReducedMotion } from "./while-seen";

import s from "./chat.module.css";
import b from "./landing.module.css";

type ChatMessage = { side: "sent" | "got"; text: string; time: string };

export type ChatCopy = {
  screenLabel: string;
  matched: string;
  start: string;
  today: string;
  messages: ChatMessage[];
  typeMessage: string;
  caption: string;
};

/** The beats fill in while the phone's center climbs from 90% to 50% of the viewport. */
const SCROLL_FROM = 0.9;
const SCROLL_TO = 0.5;
const SENDING_MS = 450;

/**
 * Section 04's phone: the chat opens on its empty state and fills bubble by
 * bubble as the visitor scrolls to it, each sent one showing the clock before
 * its ticks. Scrolling back empties it again. With reduced motion, or before
 * this runs, the whole conversation is simply there.
 */
export const ChatDemo = ({
  className,
  copy,
}: {
  className: string;
  copy: ChatCopy;
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(0);
  const [sending, setSending] = useState<number>();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || prefersReducedMotion()) return;
    const beats = copy.messages.length + 1;
    let frame = 0;
    let last = -1;
    let clock = 0;
    const follow = () => {
      frame = 0;
      const { top, height } = stage.getBoundingClientRect();
      const progress =
        (innerHeight * SCROLL_FROM - (top + height / 2)) /
        (innerHeight * (SCROLL_FROM - SCROLL_TO));
      const next = Math.min(beats, Math.max(0, Math.ceil(progress * beats)));
      if (next === last) return;
      // Only a bubble that arrives on its own gets the clock; a jump past
      // several lands them already delivered.
      if (
        last !== -1 &&
        next === last + 1 &&
        copy.messages[next - 2]?.side === "sent"
      ) {
        clearTimeout(clock);
        setSending(next - 1);
        clock = window.setTimeout(() => setSending(undefined), SENDING_MS);
      }
      last = next;
      setShown(next);
    };
    const onScroll = () => {
      frame ||= requestAnimationFrame(follow);
    };
    follow();
    setArmed(true);
    const listeners = new AbortController();
    addEventListener("scroll", onScroll, {
      passive: true,
      signal: listeners.signal,
    });
    addEventListener("resize", onScroll, { signal: listeners.signal });
    return () => {
      listeners.abort();
      cancelAnimationFrame(frame);
      clearTimeout(clock);
      setArmed(false);
    };
  }, [copy]);

  const beat = (index: number) =>
    clsx(armed && index < shown && s.on, sending === index && s.sending);

  return (
    <figure
      className={clsx(className, shown > 0 && s["has-msg"])}
      data-armed={armed ? "" : undefined}
      data-reveal=""
      style={cssVars({ "--d": "120ms" })}
    >
      <div ref={stageRef} className={clsx(b.well, s["cv-well"])}>
        <div className={b.phone}>
          <div
            className={clsx(b.screen, s["cv-screen"])}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a screen drawn from many elements, read as one picture with one name.
            role="img"
            aria-label={copy.screenLabel}
          >
            <StatusBar className={b["sb-chat"]} />
            <div className={s["ch-head"]} aria-hidden="true">
              <svg
                className={s["ch-back"]}
                viewBox="0 0 10 16"
                width="9"
                height="15"
              >
                <path
                  d="M8.5 1.5 2 8l6.5 6.5"
                  fill="none"
                  stroke="#0B0B0F"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <img
                className={s["ch-avatar"]}
                src="/landing/nina-avatar.webp"
                alt=""
                width={48}
                height={48}
                loading="lazy"
              />
              <b>Nina</b>
            </div>
            <div className={s["ch-body"]} aria-hidden="true">
              <div className={s["ch-empty"]}>
                <b>{copy.matched}</b>
                <span>{copy.start}</span>
              </div>
              <span className={clsx(s["ch-day"], beat(0))} data-beat="">
                {copy.today}
              </span>
              {copy.messages.map(({ side, text, time }, index) => (
                <div
                  key={time}
                  className={clsx(s.msg, s[side], beat(index + 1))}
                  data-beat=""
                >
                  <p>{text}</p>
                  <span className={s.meta}>
                    {time}
                    {side === "sent" ? (
                      <>
                        {" "}
                        <i className={s.st} />
                      </>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
            <div className={s["ch-send"]} aria-hidden="true">
              <span>{copy.typeMessage}</span>
            </div>
          </div>
        </div>
      </div>
      <figcaption className={b.cap}>{copy.caption}</figcaption>
    </figure>
  );
};
