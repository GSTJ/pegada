"use client";

import type { SwipeKind } from "@/components/landing/hero-swipe";

import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  ReactNode,
} from "react";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DogPhoto } from "@/components/landing/dog-photo";
import { DECK, DOGS, inLocale } from "@/components/landing/dogs";
import {
  feedbackOpacity,
  OUT_FACTOR,
  ROTATION_PER_PX,
  swipeKind,
  THROW_MS,
} from "@/components/landing/hero-swipe";
import { PawPrint } from "@/components/landing/paw-print";
import { cn } from "@/lib/utils";

import styles from "./hero.module.css";

/** Per dog, already interpolated on the server. */
type DogCopy = {
  label: string;
  skipped: string;
  maybed: string;
  liked: string;
  profile: string;
  photo: string;
};

export type DeckCopy = {
  label: string;
  roleDescription: string;
  keys: string;
  hint: string;
  note: string;
  skip: string;
  maybe: string;
  like: string;
  yourDog: string;
  youGotA: string;
  matchCaption: string;
  sendMessage: string;
  keepSwiping: string;
  emptyTitle: string;
  emptyDescription: string;
  preferences: string;
  reshuffle: string;
  shuffled: string;
  dogs: Record<string, DogCopy>;
};

type HeroDeckProps = {
  locale: string;
  copy: DeckCopy;
  /** Each dog's ID card (a server component), shown when its card flips. */
  backs: Record<string, ReactNode>;
};

/** The one dog on the page who likes yours back. */
const MATCH_ID = DOGS.nina.id;

/** Under a drag of this many px, a release is a tap and flips the card. */
const TAP_SLOP = 6;
/** Velocity is read over the last stretch of the drag, not the last event. */
const VELOCITY_WINDOW_MS = 60;
/** How long the deck sits in view, untouched, before it shows it can move. */
const NUDGE_AFTER_MS = 1900;
const NUDGE_X = 42;

/**
 * The cards under the top one, tilted like a hand-held stack. Kept small
 * enough that a tilted card's box never outgrows the top one, whose photo has
 * to stay the page's largest paint (LCP).
 */
const STACK = [0, -2, 2.5].map(
  (tilt, depth) =>
    ({ "--depth": depth, "--tilt": `${tilt}deg` }) as CSSProperties,
);

/** Reanimated's default `withTiming` curve (quad in-out), for button throws. */
const EASE_QUAD_IN_OUT = "cubic-bezier(0.45, 0, 0.55, 1)";

const REACTIONS = [
  { kind: "nope", icon: "/landing/hero/confused.webp" },
  { kind: "maybe", icon: "/landing/hero/thinking.webp" },
  { kind: "like", icon: "/landing/hero/heart-eyes.webp" },
] as const satisfies { kind: SwipeKind; icon: string }[];

const LABEL: Record<SwipeKind, "skip" | "maybe" | "like"> = {
  nope: "skip",
  maybe: "maybe",
  like: "like",
};

const ANNOUNCE: Record<SwipeKind, keyof DogCopy> = {
  nope: "skipped",
  maybe: "maybed",
  like: "liked",
};

type Drag = {
  pointerId: number;
  x0: number;
  y0: number;
  x: number;
  y: number;
  moved: boolean;
  samples: { t: number; x: number; y: number }[];
};

/** A small static webp (the app's emoji and wordmark): no image pipeline needed. */
const Sticker = ({
  src,
  alt = "",
  width = 96,
  height = 96,
  className,
}: {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
}) => (
  // oxlint-disable-next-line nextjs/no-img-element -- tiny pre-sized webp, nothing for next/image to optimize.
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    className={className}
  />
);

// Everything the first paint doesn't show waits for `load`, so none of it
// shares the network with the top photo, which is the page's LCP.
const subscribeLoad = (onLoad: () => void) => {
  window.addEventListener("load", onLoad);
  return () => window.removeEventListener("load", onLoad);
};
const isLoaded = () => document.readyState === "complete";
const notLoaded = () => false;

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PinIcon = () => (
  <svg viewBox="0 0 12 15" aria-hidden className={styles.pin}>
    <path
      fill="currentColor"
      d="M6 0a6 6 0 0 0-6 6c0 4.2 5.1 8.5 5.4 8.7.3.3.9.3 1.2 0C6.9 14.5 12 10.2 12 6a6 6 0 0 0-6-6Zm0 8.3A2.3 2.3 0 1 1 6 3.7a2.3 2.3 0 0 1 0 4.6Z"
    />
  </svg>
);

/** Moves a card and fades its reactions in, like `FeedbackCard`. */
const place = (card: HTMLElement, x: number, y: number) => {
  card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${x * ROTATION_PER_PX}deg)`;
  const opacity = feedbackOpacity(x, y);
  for (const el of card.querySelectorAll<HTMLElement>("[data-feedback]")) {
    el.style.opacity = String(opacity[el.dataset.feedback as SwipeKind]);
  }
};

/** Throws a card out along the given transition. */
const fling = (card: HTMLElement, x: number, y: number, transition: string) => {
  delete card.dataset.dragging;
  card.style.transition = `transform ${transition}`;
  for (const el of card.querySelectorAll<HTMLElement>("[data-feedback]")) {
    el.style.transition = `opacity ${transition}`;
  }
  place(card, x, y);
};

/** Back to rest: the CSS transition is the app's 230ms snap-back. */
const settle = (card: HTMLElement) => {
  delete card.dataset.dragging;
  card.style.transform = "";
  for (const el of card.querySelectorAll<HTMLElement>("[data-feedback]")) {
    el.style.opacity = "";
  }
};

/**
 * The hero's deck: Lua, Nina and Maui, thrown with the app's physics, its
 * three reactions as buttons and arrow keys, a tap (or Enter) to turn a card
 * over to the dog's ID, the app's match when Nina is liked, and its empty
 * state when the deck runs out.
 *
 * The server renders the same stack this hydrates into, so the first paint
 * (the top photo is the LCP) never moves. Card motion is written straight to
 * the element during a drag; React only hears about committed swipes.
 */
export const HeroDeck = ({ locale, copy, backs }: HeroDeckProps) => {
  const [order, setOrder] = useState(() => DECK.map(({ id }) => id));
  const [deals, setDeals] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [panel, setPanel] = useState<"match" | "empty">();
  const [announcement, setAnnouncement] = useState("");
  // The photos under the top card, the ID backs and the drag reactions.
  const loaded = useSyncExternalStore(subscribeLoad, isLoaded, notLoaded);
  // A visitor who flips or swipes before the page's load event shouldn't
  // meet a blank back or a card with no photo.
  const [engaged, setEngaged] = useState(false);
  const ready = loaded || engaged;

  const deckRef = useRef<HTMLDivElement>(null);
  const panelHeadingRef = useRef<HTMLParagraphElement>(null);
  const cards = useRef(new Map<string, HTMLDivElement>());
  const drag = useRef<Drag>(undefined);
  const busy = useRef(false);
  const touched = useRef(false);
  const nudge = useRef<Animation[]>([]);

  const keysId = useId();
  const hintId = useId();

  const [topId] = order;
  const top = topId ? copy.dogs[topId] : undefined;

  const touch = useCallback(() => {
    touched.current = true;
    setEngaged(true);
    for (const animation of nudge.current) animation.cancel();
  }, []);

  const commit = useCallback(
    (kind: SwipeKind, source: keyof typeof THROW_MS) => {
      const deck = deckRef.current;
      const card = topId && cards.current.get(topId);
      if (!deck || !card || !top || busy.current) return;
      busy.current = true;
      touch();

      const done = () => {
        card.style.visibility = "hidden";
        const rest = order.slice(1);
        setOrder(rest);
        setFlipped(false);
        const isMatch = kind === "like" && topId === MATCH_ID;
        setAnnouncement(isMatch ? copy.matchCaption : top[ANNOUNCE[kind]]);

        if (isMatch) {
          window.setTimeout(() => setPanel("match"), reducedMotion() ? 0 : 120);
          return;
        }
        if (rest.length === 0) {
          setPanel("empty");
          return;
        }
        busy.current = false;
      };

      if (reducedMotion()) {
        card
          .animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 160,
            easing: "ease",
            fill: "forwards",
          })
          .addEventListener("finish", done);
        return;
      }

      // From wherever the drag let go; only the thrown axis travels.
      const from = drag.current ?? { x: 0, y: 0 };
      const sideways = deck.offsetWidth * OUT_FACTOR;
      const x = { like: sideways, nope: -sideways, maybe: from.x }[kind];
      const y = kind === "maybe" ? -deck.offsetHeight * OUT_FACTOR : from.y;
      const duration = THROW_MS[source];
      const easing =
        source === "gesture" ? "var(--ease-out)" : EASE_QUAD_IN_OUT;

      fling(card, x, y, `${duration}ms ${easing}`);
      window.setTimeout(done, duration);
    },
    [copy.matchCaption, order, top, topId, touch],
  );

  const flip = useCallback(() => {
    if (!top || busy.current) return;
    touch();
    setFlipped(!flipped);
    setAnnouncement(flipped ? top.photo : top.profile);
  }, [flipped, top, touch]);

  const reshuffle = useCallback(() => {
    setOrder(DECK.map(({ id }) => id));
    setDeals((count) => count + 1);
    setFlipped(false);
    setPanel(undefined);
    setAnnouncement(copy.shuffled);
    busy.current = false;
    deckRef.current?.focus({ preventScroll: true });
  }, [copy.shuffled]);

  const keepSwiping = useCallback(() => {
    setPanel(order.length === 0 ? "empty" : undefined);
    if (order.length > 0) {
      busy.current = false;
      deckRef.current?.focus({ preventScroll: true });
    }
  }, [order.length]);

  // The panel takes focus, so a keyboard or screen reader lands on it.
  useEffect(() => {
    if (panel) panelHeadingRef.current?.focus({ preventScroll: true });
  }, [panel]);

  // One nudge toward a like, once, for a visitor who hasn't touched the deck
  // and is actually looking at it.
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck || reducedMotion()) return;

    let timer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearTimeout(timer);
        if (!entry?.isIntersecting) return;
        timer = window.setTimeout(() => {
          const card = cards.current.get(DECK[0]?.id ?? "");
          if (touched.current || document.hidden || busy.current || !card) {
            return;
          }
          touched.current = true;
          observer.disconnect();
          // WAAPI takes no CSS variables: this is `--ease-in-out`.
          const options = {
            duration: 1100,
            easing: "cubic-bezier(0.77, 0, 0.175, 1)",
          };
          const rest = "translate3d(0, 0, 0) rotate(0deg)";
          const peak = `translate3d(${NUDGE_X}px, 0, 0) rotate(${NUDGE_X * ROTATION_PER_PX}deg)`;
          const like = card.querySelector<HTMLElement>(
            '[data-feedback="like"]',
          );
          nudge.current = [
            card.animate(
              [{ transform: rest }, { transform: peak }, { transform: rest }],
              options,
            ),
            ...(like
              ? [
                  like.animate(
                    [
                      { opacity: 0 },
                      { opacity: feedbackOpacity(NUDGE_X, 0).like },
                      { opacity: 0 },
                    ],
                    options,
                  ),
                ]
              : []),
          ];
        }, NUDGE_AFTER_MS);
      },
      { threshold: 0.6 },
    );
    observer.observe(deck);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const card = event.currentTarget;
      if (
        event.button !== 0 ||
        drag.current ||
        busy.current ||
        panel ||
        card.dataset.id !== topId
      ) {
        return;
      }
      touch();
      card.setPointerCapture(event.pointerId);
      card.dataset.dragging = "";
      drag.current = {
        pointerId: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        x: 0,
        y: 0,
        moved: false,
        samples: [{ t: event.timeStamp, x: 0, y: 0 }],
      };
    },
    [panel, topId, touch],
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const { current } = drag;
    if (!current || event.pointerId !== current.pointerId) return;
    current.x = event.clientX - current.x0;
    current.y = event.clientY - current.y0;
    current.moved ||= Math.hypot(current.x, current.y) > TAP_SLOP;
    current.samples.push({ t: event.timeStamp, x: current.x, y: current.y });
    while (
      current.samples.length > 2 &&
      event.timeStamp - (current.samples[0]?.t ?? 0) > VELOCITY_WINDOW_MS
    ) {
      current.samples.shift();
    }
    place(event.currentTarget, current.x, current.y);
  }, []);

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const { current } = drag;
      if (!current || event.pointerId !== current.pointerId) return;
      const card = event.currentTarget;
      const first = current.samples[0] ?? { t: event.timeStamp, x: 0, y: 0 };
      const elapsed = Math.max(1, event.timeStamp - first.t);
      const kind =
        event.type === "pointerup"
          ? swipeKind(
              current.x,
              current.y,
              (current.x - first.x) / elapsed,
              (current.y - first.y) / elapsed,
            )
          : undefined;

      if (kind) {
        commit(kind, "gesture");
      } else {
        settle(card);
        if (!current.moved && event.type === "pointerup") flip();
      }
      drag.current = undefined;
    },
    [commit, flip],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || panel) return;
      const kind = (
        { ArrowLeft: "nope", ArrowUp: "maybe", ArrowRight: "like" } as const
      )[event.key];
      if (kind) {
        event.preventDefault();
        commit(kind, "key");
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flip();
      }
    },
    [commit, flip, panel],
  );

  const onReaction = useCallback(
    (event: MouseEvent<HTMLButtonElement>) =>
      commit(
        event.currentTarget.dataset.kind as SwipeKind,
        // `detail` is 0 when Enter or Space pressed the button.
        event.detail === 0 ? "key" : "button",
      ),
    [commit],
  );

  const setCard = useCallback((el: HTMLDivElement | null) => {
    if (el?.dataset.id) cards.current.set(el.dataset.id, el);
  }, []);

  const { nina } = DOGS;

  return (
    <div className={styles.play}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the deck is the swipe surface; its arrow keys mirror the reaction buttons. */}
      <div
        ref={deckRef}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the deck takes the arrow keys, so it has to be reachable.
        tabIndex={0}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a card stack, not a form fieldset.
        role="group"
        aria-roledescription={copy.roleDescription}
        aria-label={top && !panel ? `${copy.label}: ${top.label}` : copy.label}
        aria-describedby={`${hintId} ${keysId}`}
        className={styles.deck}
        onKeyDown={onKeyDown}
      >
        {DECK.map((dog) => {
          const depth = order.indexOf(dog.id);
          const isTop = depth === 0;
          const isFlipped = isTop && flipped;
          return (
            <div
              key={`${dog.id}-${deals}`}
              ref={setCard}
              data-id={dog.id}
              data-top={isTop || undefined}
              data-lead={dog.id === DECK[0]?.id || undefined}
              data-flipped={isFlipped || undefined}
              hidden={depth === -1}
              // Under a panel the next card is covered, so it's hidden too.
              aria-hidden={!isTop || Boolean(panel)}
              className={styles.card}
              style={STACK[Math.max(depth, 0)]}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div className={styles.inner}>
                <div className={styles.front} aria-hidden={isFlipped}>
                  {ready || dog.id === DECK[0]?.id ? (
                    <DogPhoto
                      dog={dog}
                      alt={inLocale(dog.alt, locale)}
                      priority={dog.id === DECK[0]?.id}
                      className={styles.photo}
                    />
                  ) : null}
                  {dog.km === undefined ? null : (
                    <span className={styles.distance}>
                      <PinIcon />
                      {dog.km} km
                    </span>
                  )}
                  <div className={styles.caption}>
                    <p className={styles.who}>
                      <b>{dog.name}</b>, {inLocale(dog.age, locale)}
                    </p>
                    {dog.bio ? (
                      <p className={styles.bio}>{inLocale(dog.bio, locale)}</p>
                    ) : null}
                  </div>
                  {REACTIONS.map(({ kind, icon }) => (
                    <span
                      key={kind}
                      data-feedback={kind}
                      className={styles.feedback}
                      aria-hidden
                    >
                      {ready ? <Sticker src={icon} /> : null}
                    </span>
                  ))}
                </div>
                <div className={styles.back} aria-hidden={!isFlipped}>
                  {ready ? backs[dog.id] : null}
                </div>
              </div>
            </div>
          );
        })}

        {panel === "match" ? (
          <div className={cn(styles.panel, styles.match)}>
            <div className={styles.pair} aria-hidden>
              <span className={cn(styles.fan, styles.mine)}>
                <PawPrint className={styles.minePaw} />
                {copy.yourDog}
              </span>
              <span className={cn(styles.fan, styles.theirs)}>
                <DogPhoto dog={nina} alt="" />
              </span>
              <Sticker
                className={styles.heart}
                src="/landing/hero/heart-eyes.webp"
              />
            </div>
            <p ref={panelHeadingRef} tabIndex={-1} className={styles.gotA}>
              {copy.youGotA}{" "}
              <Sticker
                className={styles.wordmark}
                src="/landing/hero/match.webp"
                alt="Match"
                width={320}
                height={104}
              />
            </p>
            <p className={styles.panelText}>{copy.matchCaption}</p>
            <div className={styles.panelActions}>
              <a href="#walk" className={styles.primary}>
                {copy.sendMessage}
              </a>
              <button
                type="button"
                className={styles.secondary}
                onClick={keepSwiping}
              >
                {copy.keepSwiping}
              </button>
            </div>
          </div>
        ) : null}

        {panel === "empty" ? (
          <div className={styles.panel}>
            <PawPrint className={styles.emptyPaw} />
            <p
              ref={panelHeadingRef}
              tabIndex={-1}
              className={styles.panelTitle}
            >
              {copy.emptyTitle}
            </p>
            <p className={styles.panelText}>{copy.emptyDescription}</p>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.primary}
                onClick={reshuffle}
              >
                {copy.reshuffle}
              </button>
              <a href="#preferences" className={styles.link}>
                {copy.preferences}
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* The tap that turns the card, as a control a screen reader can name. */}
      {top && !panel ? (
        <button
          type="button"
          className="sr-only"
          // Out of the tab order: the deck is the keyboard stop and Enter on
          // it flips, so a focused invisible button would only lose the ring.
          tabIndex={-1}
          aria-pressed={flipped}
          onClick={flip}
        >
          {top.profile}
        </button>
      ) : null}

      <div className={styles.reactions} data-idle={Boolean(panel) || undefined}>
        {REACTIONS.map(({ kind, icon }) => (
          <button
            key={kind}
            type="button"
            data-kind={kind}
            className={styles.reaction}
            aria-label={copy[LABEL[kind]]}
            disabled={Boolean(panel) || !top}
            onClick={onReaction}
          >
            <Sticker src={icon} />
          </button>
        ))}
      </div>

      <p id={hintId} className={styles.hint}>
        {copy.hint}
      </p>
      <p id={keysId} className="sr-only">
        {copy.keys}
      </p>
      <p className={styles.note}>{copy.note}</p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
};
