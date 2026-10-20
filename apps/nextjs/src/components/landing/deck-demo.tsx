"use client";

/* oxlint-disable nextjs/no-img-element -- pre-sized AVIF/WebP pairs in <picture> and small fixed assets; next/image adds a loader for nothing here. */
import type { Lean, Swipe } from "./deck-swipe";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { clsx } from "clsx";

import { cssVars } from "./css-vars";
import {
  cardTransform,
  feedbackOpacity,
  leanOf,
  releaseSwipe,
} from "./deck-swipe";
import { StatusBar } from "./status-bar";
import { prefersReducedMotion, whileSeen } from "./while-seen";

import s from "./deck.module.css";
import b from "./landing.module.css";

export type DeckDog = {
  id: "nina" | "maui";
  name: string;
  age: string;
  dist: string;
  bio?: string;
  alt: string;
  /** Already liked Lua, so a like or a maybe is a match. */
  likedYou: boolean;
  /** What the answer card says after each swipe on this dog. */
  said: Record<Swipe, string>;
  /** Announced when this dog comes up next, and when the deck restarts on it. */
  now: string;
  back: string;
};

type Answer = { title: string; desc: string; keyLabel: string };

export type DeckCopy = {
  answers: Record<Swipe, Answer>;
  deckRole: string;
  deckLabel: string;
  emptyTitle: string;
  emptyDesc: string;
  seeAgain: string;
  youGotA: string;
  likedNina: string;
  sendMessage: string;
  keepSwiping: string;
  demoNote: string;
  upTop: string;
  matchLive: string;
  none: string;
};

type Outcome = { text: string; upTop: boolean };
type Ease = "in-out" | "out";

const EMOJI = {
  maybe: "/landing/thinking.webp",
  nope: "/landing/confused.webp",
  like: "/landing/heart-eyes.webp",
} satisfies Record<Swipe, string>;
const KEY_GLYPH = { maybe: "↑", nope: "←", like: "→" } satisfies Record<
  Swipe,
  string
>;
const KEYS: Partial<Record<string, Swipe>> = {
  ArrowLeft: "nope",
  ArrowUp: "maybe",
  ArrowRight: "like",
};
const SWIPES = ["nope", "maybe", "like"] as const satisfies Swipe[];
const FEEDBACK_ORDER = ["maybe", "nope", "like"] as const satisfies Swipe[];

/** The app's timings: snap back, gesture throw, button throw, throw distance per deck width. */
const SNAP_MS = 230;
const GESTURE_MS = 250;
const BUTTON_MS = 500;
const THROW = 1.7;
const LEAVE_MS = 180;
const NOTE_MS = 3400;
const IN_OUT_QUAD = "cubic-bezier(.455, .03, .515, .955)";
const EASE_IOS = "cubic-bezier(.32, .72, 0, 1)";
const EASE_OUT = "cubic-bezier(.23, 1, .32, 1)";

/** The lean it plays while nobody has touched the deck: right, left, up. */
const TUTOR: [x: number, y: number, ms: number, ease?: Ease][] = [
  [0, 0, 700],
  [72, 0, 640, "in-out"],
  [72, 0, 520],
  [0, 0, 560, "out"],
  [0, 0, 380],
  [-72, 0, 640, "in-out"],
  [-72, 0, 520],
  [0, 0, 560, "out"],
  [0, 0, 380],
  [0, -64, 640, "in-out"],
  [0, -64, 520],
  [0, 0, 560, "out"],
  [0, 0, 1700],
];
const TUTOR_MS = TUTOR.reduce((sum, step) => sum + step[2], 0);
const EASES: Record<Ease, (t: number) => number> = {
  "in-out": (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t) => 1 - (1 - t) ** 3,
};

const c = (name: string) => s[name] ?? name;

const AnswerBlock = ({
  dir,
  answer,
  outcome,
  on,
  upTop,
}: {
  dir: Swipe;
  answer: Answer;
  outcome: Outcome | undefined;
  on: boolean;
  upTop: string;
}) => {
  const emoji = (
    <img
      className={s["ans-emo"]}
      src={EMOJI[dir]}
      alt=""
      width={28}
      height={28}
      loading="lazy"
      data-emo=""
    />
  );
  const key = (
    <kbd>
      <span aria-hidden="true">{KEY_GLYPH[dir]}</span>
      <span className={b["sr-only"]}>{answer.keyLabel}</span>
    </kbd>
  );

  return (
    <div className={clsx(s.ans, s[`ans-${dir}`])} data-ans={dir}>
      <div className={s["ans-head"]}>
        {dir === "nope" ? key : emoji}
        <h3>{answer.title}</h3>
        {dir === "nope" ? emoji : key}
      </div>
      <p className={s["ans-desc"]}>{answer.desc}</p>
      <span className={s.meter} aria-hidden="true">
        <i />
      </span>
      <p className={clsx(s.outcome, on && s["is-on"])} aria-hidden="true">
        {outcome?.text}
        {outcome?.upTop ? (
          <>
            {" "}
            <a href="#topo" tabIndex={-1}>
              {upTop}
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
};

const Card = ({ dog }: { dog: DeckDog }) => (
  <div className={s.card} data-card="">
    <picture>
      <source srcSet={`/landing/${dog.id}.avif`} type="image/avif" />
      <img
        className={s["card-photo"]}
        src={`/landing/${dog.id}.webp`}
        alt={dog.alt}
        width={720}
        height={1028}
        draggable={false}
        loading="lazy"
      />
    </picture>
    <div className={s["card-scrim"]} />
    <span className={s["card-dist"]}>{dog.dist}</span>
    <div className={s["card-info"]}>
      <p className={s["card-name"]}>
        <b>{dog.name}</b>, {dog.age}
      </p>
      {dog.bio ? <p className={s["card-bio"]}>{dog.bio}</p> : null}
    </div>
    {FEEDBACK_ORDER.map((dir) => (
      <div key={dir} className={clsx(s.fb, s[`fb-${dir}`])} data-fb={dir}>
        <img src={EMOJI[dir]} alt="" width={64} height={64} loading="lazy" />
      </div>
    ))}
  </div>
);

/**
 * Section 02's well: Nina's card in the app's deck, answered by drag, the
 * three buttons or the arrow keys, with the app's own thresholds and
 * timings. The answers around the phone light up with the lean. Nina already
 * liked Lua, so a like or a maybe opens the Match screen; Maui after her is a
 * plain like, and then the deck is empty. Until the first touch it leans on
 * its own to show the three answers.
 */
export const DeckDemo = ({
  dogs,
  copy,
}: {
  dogs: DeckDog[];
  copy: DeckCopy;
}) => {
  const wellRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const matchRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [match, setMatch] = useState<"closed" | "open" | "leaving">("closed");
  const [outcomes, setOutcomes] = useState<Partial<Record<Swipe, Outcome>>>({});
  const [shown, setShown] = useState<Swipe>();
  const [live, setLive] = useState("");
  const [note, setNote] = useState("");
  const [noteOn, setNoteOn] = useState(false);

  useEffect(() => {
    const well = wellRef.current;
    const answers = answersRef.current;
    const deck = deckRef.current;
    const cards = cardsRef.current;
    const matchScreen = matchRef.current;
    const reset = deck?.querySelector<HTMLElement>("[data-reset]");
    const send = matchScreen?.querySelector<HTMLElement>("[data-send]");
    const keepSwiping =
      matchScreen?.querySelector<HTMLElement>("[data-continue]");
    if (
      !well ||
      !answers ||
      !deck ||
      !cards ||
      !reset ||
      !send ||
      !keepSwiping
    ) {
      return;
    }
    const listeners = new AbortController();
    const { signal } = listeners;
    const timers = new Set<number>();
    const later = (run: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        run();
      }, ms);
      timers.add(id);
      return id;
    };

    let i = 0;
    let x = 0;
    let y = 0;
    let isBusy = false;
    let locked = false;
    let drag:
      | {
          id: number;
          ox: number;
          oy: number;
          samples: { x: number; y: number; t: number }[];
        }
      | undefined;
    let anims: Animation[] = [];
    let armed: Swipe | undefined;

    const top = () => cards.lastElementChild as HTMLElement | null;
    const idle = () => !isBusy && !drag && !locked && Boolean(top());
    const feedback = (card: HTMLElement) =>
      SWIPES.map((dir) =>
        card.querySelector<HTMLElement>(`[data-fb="${dir}"]`),
      );

    // The answers follow the lean; the meter fills toward the 100px commit and the emoji ticks when armed.
    const lean = (state: Lean | undefined) => {
      if (state) answers.dataset.lean = state.dir;
      else delete answers.dataset.lean;
      for (const el of answers.querySelectorAll<HTMLElement>("[data-ans]")) {
        el.style.setProperty(
          "--amt",
          state && state.dir === el.dataset.ans ? state.amount.toFixed(3) : "0",
        );
      }
      const next = state?.armed ? state.dir : undefined;
      if (next === armed) return;
      armed = next;
      if (next && !prefersReducedMotion()) {
        answers
          .querySelector(`[data-ans="${next}"] [data-emo]`)
          ?.animate([{ scale: 1 }, { scale: 1.24 }, { scale: 1 }], {
            duration: 340,
            easing: EASE_OUT,
          });
      }
    };

    const paint = (nextX: number, nextY: number) => {
      x = nextX;
      y = nextY;
      const card = top();
      if (!card) return;
      card.style.transform = cardTransform(x, y);
      const opacity = feedbackOpacity(x, y);
      for (const [k, el] of feedback(card).entries()) {
        const dir = SWIPES[k];
        if (el && dir) el.style.opacity = String(opacity[dir]);
      }
      lean(leanOf(x, y));
    };

    const stopAnims = () => {
      const card = top();
      if (!card || anims.length === 0) return;
      const matrix = new DOMMatrix(getComputedStyle(card).transform);
      for (const anim of anims) anim.cancel();
      anims = [];
      paint(matrix.m41, matrix.m42);
    };

    const snapBack = (ms = SNAP_MS) => {
      const card = top();
      if (!card) return;
      const from = card.style.transform;
      const tints = feedback(card).filter(
        (el): el is HTMLElement => el !== null,
      );
      const opacities = tints.map((el) => Number(el.style.opacity) || 0);
      paint(0, 0);
      lean(undefined);
      if (prefersReducedMotion()) return;
      const settle = { duration: ms, easing: EASE_IOS };
      anims = [
        card.animate(
          [{ transform: from }, { transform: card.style.transform }],
          settle,
        ),
        ...tints.map((el, k) =>
          el.animate([{ opacity: opacities[k] ?? 0 }, { opacity: 0 }], settle),
        ),
      ];
      const [first] = anims;
      if (first) {
        first.onfinish = () => {
          anims = [];
        };
      }
    };

    let tutorSeen = false;
    let hover = false;
    let focus = false;
    let tutorDone = false;
    let frame = 0;
    let t0 = 0;
    const canTutor = () =>
      tutorSeen && !hover && !focus && !tutorDone && idle();
    const tutorFrame = (now: number) => {
      if (!canTutor()) {
        frame = 0;
        return;
      }
      let t = (now - t0) % TUTOR_MS;
      let fromX = 0;
      let fromY = 0;
      for (const [toX, toY, ms, ease] of TUTOR) {
        if (t < ms) {
          const k = ease ? EASES[ease](t / ms) : 1;
          paint(fromX + (toX - fromX) * k, fromY + (toY - fromY) * k);
          break;
        }
        t -= ms;
        fromX = toX;
        fromY = toY;
      }
      frame = requestAnimationFrame(tutorFrame);
    };
    const syncTutor = () => {
      if (canTutor() && !frame) {
        t0 = performance.now();
        frame = requestAnimationFrame(tutorFrame);
      } else if (!canTutor() && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        if (!tutorDone && idle()) snapBack(360);
      }
    };
    const demo = whileSeen(
      well,
      () => {
        tutorSeen = true;
        syncTutor();
      },
      () => {
        tutorSeen = false;
        syncTutor();
      },
    );
    // Stops for good on the first touch.
    const stopTutor = () => {
      if (tutorDone) return;
      tutorDone = true;
      cancelAnimationFrame(frame);
      frame = 0;
      demo.done();
    };

    const openMatch = () => {
      locked = true;
      flushSync(() => setMatch("open"));
      setLive(copy.matchLive);
      keepSwiping.focus({ preventScroll: true });
    };

    const closeMatch = () => {
      const done = () => {
        flushSync(() => {
          setMatch("closed");
          setNoteOn(false);
        });
        locked = false;
        deck.focus({ preventScroll: true });
        const next = dogs[i];
        if (next) setLive(next.now);
      };
      if (prefersReducedMotion()) {
        done();
        return;
      }
      setMatch("leaving");
      later(done, LEAVE_MS);
    };

    const commit = (dir: Swipe, duration: number) => {
      const card = top();
      if (isBusy || locked || !card || drag) return;
      stopTutor();
      stopAnims();
      isBusy = true;
      setBusy(true);
      lean({ dir, amount: 1, armed: true });
      let toX = x;
      let toY = y;
      if (dir === "like") toX = deck.offsetWidth * THROW;
      if (dir === "nope") toX = -deck.offsetWidth * THROW;
      if (dir === "maybe") toY = -deck.offsetHeight * THROW;
      const tint = card.querySelector<HTMLElement>(`[data-fb="${dir}"]`);
      const tintFrom = Number(tint?.style.opacity) || 0;
      let anim: Animation;
      if (prefersReducedMotion()) {
        if (tint) tint.style.opacity = "1";
        anim = card.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 160,
          fill: "forwards",
        });
      } else {
        anim = card.animate(
          [
            { transform: card.style.transform },
            { transform: cardTransform(toX, toY) },
          ],
          { duration, easing: IN_OUT_QUAD, fill: "forwards" },
        );
        tint?.animate(
          [{ opacity: tintFrom }, { opacity: 1, offset: 0.3 }, { opacity: 1 }],
          { duration, fill: "forwards" },
        );
      }
      anim.onfinish = () => {
        const dog = dogs[i];
        if (!dog) return;
        i += 1;
        x = 0;
        y = 0;
        lean(undefined);
        const text = dog.said[dir];
        const matched = dog.likedYou && dir !== "nope";
        flushSync(() => {
          setIndex(i);
          setShown(dir);
          setOutcomes((previous) => ({
            ...previous,
            [dir]: { text, upTop: matched },
          }));
        });
        if (matched) {
          openMatch();
        } else {
          const next = dogs[i];
          setLive(`${text} ${next ? next.now : copy.none}`);
          if (!next) reset.focus({ preventScroll: true });
        }
        // The app takes the gesture back one more throw later.
        later(() => {
          isBusy = false;
          setBusy(false);
        }, duration);
      };
    };

    const release = (event: PointerEvent, cancelled: boolean) => {
      if (!drag || event.pointerId !== drag.id) return;
      const { samples } = drag;
      drag = undefined;
      top()?.classList.remove(c("is-dragging"));
      const from =
        samples.find((sample) => event.timeStamp - sample.t <= 80) ??
        samples.at(-1);
      const dt = Math.max(1, event.timeStamp - (from?.t ?? 0));
      const dir = cancelled
        ? undefined
        : releaseSwipe(
            x,
            y,
            (x - (from?.x ?? x)) / dt,
            (y - (from?.y ?? y)) / dt,
          );
      if (dir) commit(dir, GESTURE_MS);
      else snapBack();
    };

    cards.addEventListener(
      "pointerdown",
      (event) => {
        const card = (event.target as Element).closest<HTMLElement>(
          "[data-card]",
        );
        if (
          isBusy ||
          locked ||
          drag ||
          event.button !== 0 ||
          !card ||
          card !== top()
        ) {
          return;
        }
        stopTutor();
        stopAnims();
        drag = {
          id: event.pointerId,
          ox: event.clientX - x,
          oy: event.clientY - y,
          samples: [{ x, y, t: event.timeStamp }],
        };
        card.setPointerCapture(event.pointerId);
        card.classList.add(c("is-dragging"));
      },
      { signal },
    );
    cards.addEventListener(
      "pointermove",
      (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        paint(event.clientX - drag.ox, event.clientY - drag.oy);
        drag.samples.push({ x, y, t: event.timeStamp });
        while (
          drag.samples.length > 2 &&
          event.timeStamp - (drag.samples[0]?.t ?? 0) > 100
        ) {
          drag.samples.shift();
        }
      },
      { signal },
    );
    cards.addEventListener("pointerup", (event) => release(event, false), {
      signal,
    });
    cards.addEventListener("pointercancel", (event) => release(event, true), {
      signal,
    });
    cards.addEventListener("dragstart", (event) => event.preventDefault(), {
      signal,
    });
    deck.addEventListener(
      "keydown",
      (event) => {
        const dir = KEYS[event.key];
        const target = event.target as Element;
        if (!dir || !(target === deck || target.closest("[data-act]"))) return;
        event.preventDefault();
        commit(dir, BUTTON_MS);
      },
      { signal },
    );
    for (const button of deck.querySelectorAll<HTMLElement>("[data-act]")) {
      button.addEventListener(
        "click",
        () => commit(button.dataset.act as Swipe, BUTTON_MS),
        { signal },
      );
    }
    reset.addEventListener(
      "click",
      () => {
        i = 0;
        x = 0;
        y = 0;
        flushSync(() => {
          setIndex(0);
          setShown(undefined);
        });
        if (dogs[0]) setLive(dogs[0].back);
        deck.focus({ preventScroll: true });
      },
      { signal },
    );
    let noteTimer = 0;
    send.addEventListener(
      "click",
      () => {
        setNote(copy.demoNote);
        setNoteOn(true);
        clearTimeout(noteTimer);
        noteTimer = later(() => setNoteOn(false), NOTE_MS);
      },
      { signal },
    );
    keepSwiping.addEventListener("click", closeMatch, { signal });
    well.addEventListener(
      "pointerenter",
      (event) => {
        if (event.pointerType !== "mouse") return;
        hover = true;
        syncTutor();
      },
      { signal },
    );
    well.addEventListener(
      "pointerleave",
      () => {
        hover = false;
        syncTutor();
      },
      { signal },
    );
    well.addEventListener(
      "focusin",
      () => {
        focus = true;
        syncTutor();
      },
      { signal },
    );
    well.addEventListener(
      "focusout",
      () => {
        focus = false;
        syncTutor();
      },
      { signal },
    );

    return () => {
      listeners.abort();
      demo.dispose();
      cancelAnimationFrame(frame);
      for (const id of timers) clearTimeout(id);
      for (const anim of anims) anim.cancel();
    };
  }, [dogs, copy]);

  const empty = index >= dogs.length;
  const stack = [dogs[index + 1], dogs[index]].filter(
    (dog): dog is DeckDog => dog !== undefined,
  );
  const answer = (dir: Swipe) => (
    <AnswerBlock
      dir={dir}
      answer={copy.answers[dir]}
      outcome={outcomes[dir]}
      on={shown === dir}
      upTop={copy.upTop}
    />
  );

  return (
    <div
      ref={wellRef}
      className={clsx(b.well, s["dk-well"])}
      data-reveal=""
      style={cssVars({ "--d": "140ms" })}
    >
      <div ref={answersRef} className={s["dk-around"]}>
        {answer("maybe")}
        {answer("nope")}

        <div className={s["dk-slot"]}>
          <div className={b.phone}>
            <div className={b.screen}>
              <StatusBar className={b["sb-top"]} />
              <div className={s["app-loc"]} aria-hidden="true">
                <svg
                  className={s["loc-pin"]}
                  width="11"
                  height="13"
                  viewBox="0 0 10 12"
                >
                  <path d="M4.77.44a4.77 4.77 0 0 1 4.77 4.77c0 1.97-1.5 4.04-4.45 6.25a.53.53 0 0 1-.64 0C1.5 9.25 0 7.18 0 5.2A4.77 4.77 0 0 1 4.77.44Zm0 3.18a1.59 1.59 0 1 0 0 3.18 1.59 1.59 0 0 0 0-3.18Z" />
                </svg>
                <span>Ribeirão Preto</span>
                <svg
                  className={s["loc-chev"]}
                  width="10"
                  height="7"
                  viewBox="0 0 10 7"
                >
                  <path
                    d="M1.5 1.5 5 5l3.5-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div
                ref={deckRef}
                className={clsx(
                  s.deck,
                  busy && s["is-busy"],
                  empty && s["is-empty"],
                )}
                // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the arrow keys answer the focused deck, like the app's swipe.
                tabIndex={0}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a stack of cards with its own key handling; no element says that.
                role="group"
                aria-roledescription={copy.deckRole}
                aria-label={copy.deckLabel}
                inert={match !== "closed"}
              >
                <div ref={cardsRef} className={s["deck-cards"]}>
                  {stack.map((dog) => (
                    <Card key={dog.id} dog={dog} />
                  ))}
                </div>
                <div
                  className={clsx(s.empty, s["is-entering"])}
                  hidden={!empty}
                >
                  <p className={s["empty-t"]}>{copy.emptyTitle}</p>
                  <p className={s["empty-d"]}>{copy.emptyDesc}</p>
                  <button
                    className={clsx(s["app-btn"], s["app-btn-outline"])}
                    type="button"
                    data-reset=""
                  >
                    {copy.seeAgain}
                  </button>
                </div>
                <div className={s.actions}>
                  {SWIPES.map((dir) => (
                    <button
                      key={dir}
                      className={clsx(s.act, s[`act-${dir}`])}
                      type="button"
                      data-act={dir}
                      aria-label={copy.answers[dir].title}
                    >
                      <img
                        src={EMOJI[dir]}
                        alt=""
                        width={dir === "maybe" ? 22 : 37}
                        height={dir === "maybe" ? 22 : 37}
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
                <p className={b["sr-only"]} aria-live="polite">
                  {live}
                </p>
              </div>

              <div
                ref={matchRef}
                className={clsx(
                  s.match,
                  match === "open" && s["is-entering"],
                  match === "leaving" && s["is-leaving"],
                )}
                hidden={match === "closed"}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the Match screen inside the phone, named by its own headline.
                role="group"
                aria-labelledby="dk-match-t"
              >
                <div className={s["match-body"]}>
                  <div className={s["match-cards"]}>
                    {(["lua", "nina"] as const).map((dog) => (
                      <picture key={dog}>
                        <source
                          srcSet={`/landing/${dog}.avif`}
                          type="image/avif"
                        />
                        <img
                          className={clsx(
                            s.mc,
                            dog === "lua" ? s["mc-mine"] : s["mc-them"],
                          )}
                          src={`/landing/${dog}.webp`}
                          alt={dog === "lua" ? "Lua" : "Nina"}
                          width={720}
                          height={1028}
                          loading="lazy"
                        />
                      </picture>
                    ))}
                  </div>
                  <span className={s["match-badge"]}>
                    <img
                      src="/landing/heart-eyes.webp"
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                    />
                  </span>
                  <p className={s["match-pre"]} id="dk-match-t">
                    <span>{copy.youGotA}</span>{" "}
                    <span className={b["sr-only"]}>Match</span>
                  </p>
                  <img
                    className={s["match-word"]}
                    src="/landing/match.svg"
                    alt=""
                    width={2724}
                    height={882}
                    loading="lazy"
                  />
                  <p className={s["match-cap"]}>{copy.likedNina}</p>
                </div>
                <div className={s["match-btns"]}>
                  <p
                    className={clsx(s["match-note"], noteOn && s["is-on"])}
                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an <output> would need a form control to belong to; this is a plain announcement.
                    role="status"
                  >
                    {note}
                  </p>
                  <button
                    className={clsx(s["app-btn"], s["app-btn-fill"])}
                    type="button"
                    data-send=""
                  >
                    {copy.sendMessage}
                  </button>
                  <button
                    className={clsx(s["app-btn"], s["app-btn-outline"])}
                    type="button"
                    data-continue=""
                  >
                    {copy.keepSwiping}
                  </button>
                </div>
              </div>

              <nav className={s.tabbar} aria-hidden="true">
                <img
                  src="/logo.svg"
                  width={22}
                  height={23}
                  alt=""
                  loading="lazy"
                />
                <svg width="23" height="23" viewBox="0 0 32 32">
                  <path
                    fill="#0B0B0F"
                    d="M11.978 3.883C14.005 1.636 17.181.19 20.75.19c6.121 0 11.083 4.253 11.083 9.5 0 3.15-1.789 5.941-4.540 7.67a4.366 4.366 0 0 1-.21.12v6.413a1.583 1.583 0 0 1-2.72 1.102l-1.805-1.859c1.693-2.001 2.689-4.459 2.689-7.114 0-6.44-5.855-11.709-13.269-12.140Z"
                  />
                  <path
                    fill="#0B0B0F"
                    d="m13.443 25.343-5.806 5.985a1.584 1.584 0 0 1-2.720-1.102v-6.412a4.522 4.522 0 0 1-.21-.12c-2.753-1.730-4.540-4.521-4.540-7.670 0-5.247 4.962-9.5 11.083-9.5s11.083 4.253 11.083 9.5c0 4.316-3.358 7.960-7.957 9.117-.309.079-.62.146-.933.202Z"
                  />
                </svg>
                <svg width="20" height="21" viewBox="0 0 29 30">
                  <path
                    fill="#0B0B0F"
                    d="M7.730 7.292a6.946 6.946 0 0 0 6.937 6.937 6.946 6.946 0 0 0 6.937-6.937A6.946 6.946 0 0 0 14.667.354a6.946 6.946 0 0 0-6.938 6.938ZM27 29.646h1.542v-1.542c0-5.950-4.843-10.791-10.792-10.791h-6.167c-5.950 0-10.791 4.842-10.791 10.791v1.542H27Z"
                  />
                </svg>
              </nav>
              <span className={s["home-ind"]} aria-hidden="true" />
            </div>
          </div>
        </div>

        {answer("like")}
      </div>
    </div>
  );
};
