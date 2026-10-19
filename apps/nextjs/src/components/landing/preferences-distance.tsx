"use client";

import type { Dog } from "@/components/landing/dogs";

import type { ChangeEvent, CSSProperties } from "react";

import { useCallback, useEffect, useRef, useState } from "react";

import { DogPhoto } from "@/components/landing/dog-photo";
import { DOGS, inLocale } from "@/components/landing/dogs";
import { cn } from "@/lib/utils";

import styles from "./preferences.module.css";

/**
 * The app's Maximum Distance slider (`apps/mobile/src/views/Preferences`):
 * 1 to 300 km in steps of 5, plus one notch past the end that saves as "no
 * limit". Its marker snaps to 1, 5, 10 … 300, then 300+. A native range with
 * `min=1 step=5` would land on 1, 6, 11 instead, so the input moves through
 * notch indexes and `notchKm` turns them back into the app's values.
 */
const MAX_KM = 300;
const LAST_NOTCH = MAX_KM / 5 + 1;
const notchKm = (notch: number) => (notch === 0 ? 1 : notch * 5);
const isNoLimit = (notch: number) => notch === LAST_NOTCH;
const kmToFraction = (km: number) => (km <= 1 ? 0 : km / 5 / LAST_NOTCH);

/** Where the slider rests with no JS and for anyone who prefers less motion. */
const WALKING_NOTCH = 2;

/** A custom property as a style object, for the CSS module to read. */
const cssVar = (name: `--${string}`, value: number | string) =>
  ({ [name]: value }) as CSSProperties;

const onDeck = (dog: Dog, notch: number) =>
  isNoLimit(notch) || (dog.km ?? 0) <= notchKm(notch);

/** The two dogs whose cards show a distance. Nina's capture has none. */
const NEARBY = [DOGS.lua, DOGS.maui];

export type DistanceCopy = {
  label: string;
  range: string;
  noLimit: string;
  deck: string;
  onDeck: string;
  outside: string;
  left: string;
  back: string;
};

const readout = (notch: number) =>
  isNoLimit(notch) ? `${MAX_KM}+ km` : `${notchKm(notch)} km`;

export const PreferencesDistance = ({
  copy,
  locale,
}: {
  copy: DistanceCopy;
  locale: string;
}) => {
  const [notch, setNotch] = useState(WALKING_NOTCH);
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const sweep = useRef({ frame: 0, timer: 0, handedOver: false });

  // One sweep from the app's default (300+) down to walking distance, the
  // first time the panel is on screen, so Maui leaves the deck in front of
  // the visitor. Any touch on the slider hands control over and stops it.
  useEffect(() => {
    const panel = panelRef.current;
    const state = sweep.current;
    if (!panel) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (panel.getBoundingClientRect().top < innerHeight) return;

    setNotch(LAST_NOTCH);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        state.timer = window.setTimeout(() => {
          const start = performance.now();
          const duration = 1100;
          const step = (now: number) => {
            if (state.handedOver) return;
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - (1 - progress) ** 3;
            setNotch(
              Math.round(LAST_NOTCH - (LAST_NOTCH - WALKING_NOTCH) * eased),
            );
            if (progress < 1) state.frame = requestAnimationFrame(step);
          };
          state.frame = requestAnimationFrame(step);
        }, 350);
      },
      { threshold: 0.6 },
    );
    observer.observe(panel);

    return () => {
      observer.disconnect();
      clearTimeout(state.timer);
      cancelAnimationFrame(state.frame);
    };
  }, []);

  const handOver = useCallback(() => {
    sweep.current.handedOver = true;
    clearTimeout(sweep.current.timer);
    cancelAnimationFrame(sweep.current.frame);
  }, []);

  const change = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handOver();
      const next = Number(event.target.value);
      const moved = NEARBY.find(
        (dog) => onDeck(dog, notch) !== onDeck(dog, next),
      );
      if (moved) {
        setAnnouncement(
          (onDeck(moved, next) ? copy.back : copy.left).replace(
            "{name}",
            moved.name,
          ),
        );
      }
      setNotch(next);
    },
    [copy, handOver, notch],
  );

  const valueText = isNoLimit(notch)
    ? `${readout(notch)}, ${copy.noLimit}`
    : readout(notch);

  return (
    <div
      ref={panelRef}
      className="grid gap-7 rounded-card bg-blush p-6 sm:p-8"
      style={cssVar("--fill", notch / LAST_NOTCH)}
    >
      {/* Bottom room for the value bubble under the marker. */}
      <div className="pb-9">
        <div className="flex items-baseline justify-between gap-4 text-lg font-bold">
          <label htmlFor="preferences-distance">{copy.label}</label>
          <span aria-hidden>{copy.range}</span>
        </div>

        <div className="relative mt-9">
          <ol aria-hidden className={styles.pins}>
            {NEARBY.map((dog) => (
              <li
                key={dog.id}
                className={styles.pin}
                style={cssVar("--at", kmToFraction(dog.km ?? 0))}
              >
                <span className="font-mono text-[13px]">
                  {dog.name} {dog.km} km
                </span>
              </li>
            ))}
          </ol>
          <input
            id="preferences-distance"
            type="range"
            min={0}
            max={LAST_NOTCH}
            step={1}
            value={notch}
            aria-valuetext={valueText}
            onPointerDown={handOver}
            onKeyDown={handOver}
            onChange={change}
            className={styles.range}
          />
          <div aria-hidden className={styles.bubbleRail}>
            <span className={cn(styles.bubble, "font-mono")}>
              {readout(notch)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        <p className="text-label uppercase text-ink-muted">{copy.deck}</p>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {NEARBY.map((dog) => {
            const inDeck = onDeck(dog, notch);
            return (
              <li key={dog.id} data-out={inDeck ? undefined : ""}>
                <div
                  className={cn(
                    styles.miniCard,
                    "relative aspect-[0.86] overflow-hidden rounded-[18px] bg-[#1b1b1b]",
                  )}
                >
                  <DogPhoto
                    dog={dog}
                    alt=""
                    className="size-full object-cover"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-[#1b1b1b]/80 px-2 py-0.5 font-mono text-[13px] text-white">
                    {dog.km} km
                  </span>
                </div>
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-extrabold">{dog.name}</span>
                  <span className="text-sm text-ink-muted">
                    {inLocale(dog.age, locale)}
                  </span>
                </p>
                <p className="text-sm font-bold text-pink-ink">
                  {inDeck ? copy.onDeck : copy.outside}
                </p>
              </li>
            );
          })}
        </ul>
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>
    </div>
  );
};
