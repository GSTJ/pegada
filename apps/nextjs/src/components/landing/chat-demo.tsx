"use client";

/* oxlint-disable nextjs/no-img-element -- a 2KB pre-sized avatar; next/image adds a loader for nothing here. */
import { useEffect, useRef, useState } from "react";

import { clsx } from "clsx";

import { cssVars } from "./css-vars";
import { StatusBar } from "./status-bar";
import { prefersReducedMotion, whileSeen } from "./while-seen";

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
  playAgain: string;
};

/** When each beat lands after the first: the day chip, then Lua's human, Nina's, Lua's, Nina's. */
const BEAT_AT = [0, 80, 930, 1780, 2630];
const OPEN_MS = 900;
const SENDING_MS = 450;
const REPLAY_AFTER_MS = 500;

/**
 * Section 04's phone: the chat opens on its empty state and fills bubble by
 * bubble while it is on screen, each sent one showing the clock before its
 * ticks. It plays once, then offers a replay. With reduced motion, or before
 * this runs, the whole conversation is simply there.
 */
export const ChatDemo = ({
  className,
  copy,
}: {
  className: string;
  copy: ChatCopy;
}) => {
  const figureRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(0);
  const [sending, setSending] = useState<number>();
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const figure = figureRef.current;
    const stage = stageRef.current;
    const replay = replayRef.current;
    if (!figure || !stage || !replay || prefersReducedMotion()) return;
    const beats = BEAT_AT.length;
    const timers = new Set<number>();
    const later = (run: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        run();
      }, ms);
      timers.add(id);
      return id;
    };
    let next = -1;
    let timer = 0;
    let seen = false;
    let forced = false;
    const runnable = () => (seen || forced) && !document.hidden;
    const show = (beat: number) => {
      setShown(beat + 1);
      if (copy.messages[beat - 1]?.side === "sent") {
        setSending(beat);
        later(() => setSending(undefined), SENDING_MS);
      }
    };
    const step = () => {
      clearTimeout(timer);
      if (!runnable() || next >= beats) return;
      if (next === -1) {
        timer = later(() => {
          next = 0;
          step();
        }, OPEN_MS);
        return;
      }
      const wait =
        next === 0 ? 0 : (BEAT_AT[next] ?? 0) - (BEAT_AT[next - 1] ?? 0);
      timer = later(() => {
        show(next);
        next += 1;
        if (next === beats) {
          later(() => {
            setFinished(true);
            forced = false;
            demo.done();
          }, REPLAY_AFTER_MS);
        }
        step();
      }, wait);
    };
    const reset = () => {
      clearTimeout(timer);
      next = -1;
      setShown(0);
      setSending(undefined);
      setFinished(false);
    };
    const demo = whileSeen(
      stage,
      () => {
        seen = true;
        step();
      },
      () => {
        seen = false;
        if (!forced) clearTimeout(timer);
      },
      0.6,
    );
    setArmed(true);
    const listeners = new AbortController();
    document.addEventListener("visibilitychange", step, {
      signal: listeners.signal,
    });
    replay.addEventListener(
      "click",
      () => {
        reset();
        forced = true;
        figure.focus({ preventScroll: true });
        step();
      },
      { signal: listeners.signal },
    );
    return () => {
      listeners.abort();
      demo.dispose();
      for (const id of timers) clearTimeout(id);
      reset();
      setArmed(false);
    };
  }, [copy]);

  const beat = (index: number) =>
    clsx(armed && index < shown && s.on, sending === index && s.sending);

  return (
    <figure
      ref={figureRef}
      className={clsx(className, shown > 0 && s["has-msg"])}
      data-armed={armed ? "" : undefined}
      tabIndex={armed ? -1 : undefined}
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
      <figcaption className={b.cap}>
        <span>{copy.caption}</span>
        <button
          ref={replayRef}
          className={s.replay}
          type="button"
          hidden={!finished}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
            <path
              d="M2.6 8a5.4 5.4 0 1 0 1.6-3.8M2.4 1.8v3h3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{copy.playAgain}</span>
        </button>
      </figcaption>
    </figure>
  );
};
