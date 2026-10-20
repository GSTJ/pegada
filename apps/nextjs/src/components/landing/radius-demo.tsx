"use client";

/* oxlint-disable nextjs/no-img-element -- small pre-sized WebP avatars, lazy; next/image adds a loader for nothing here. */
import type { ChangeEvent } from "react";

import { useCallback, useEffect, useRef, useState } from "react";

import { clsx } from "clsx";

import { cssVars } from "./css-vars";
import {
  inRadius,
  RADIUS_DOGS,
  RADIUS_MAX,
  radiusKm,
  ringOf,
  sweepValue,
} from "./radius-scale";
import { parseRich } from "./rich";
import { prefersReducedMotion, whileSeen } from "./while-seen";

import s from "./radius.module.css";

export type RadiusCopy = {
  figLabel: string;
  you: string;
  note: string;
  maxDist: string;
  /** "Up to {km} km", filled in here. */
  upTo: string;
  noLimit: string;
  /** What the count line says with 0, 1, 2… dogs inside. */
  counts: string[];
};

const RINGS = [10, 50, 300];
const SWEEP_MS = 1600;
const SWEEP_DELAY_MS = 650;

/**
 * Section 03's map and the app's Maximum Distance slider, on one value: the
 * disc grows and shrinks with it, the dogs outside go gray, and the count
 * under it ticks. The first time it owns the screen the slider sweeps once
 * from 300+ in to 50 km, so Maui steps out as it passes 246; touching the
 * slider stops that for good.
 */
export const RadiusDemo = ({
  className,
  copy,
}: {
  className: string;
  copy: RadiusCopy;
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(50);
  const [ticks, setTicks] = useState(false);
  const slide = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(Number(event.currentTarget.value));
    setTicks(true);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const input = inputRef.current;
    if (!stage || !input || prefersReducedMotion()) return;
    setValue(RADIUS_MAX);
    let touched = false;
    let swept = false;
    let progress = 0;
    let last = 0;
    let frame = 0;
    let wait = 0;
    const step = (now: number) => {
      if (touched) return;
      progress += Math.min(64, now - last);
      last = now;
      const t = Math.min(1, progress / SWEEP_MS);
      setValue(sweepValue(t));
      setTicks(true);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        swept = true;
        demo.done();
      }
    };
    const demo = whileSeen(
      stage,
      () => {
        if (touched || swept) return;
        wait = window.setTimeout(
          () => {
            last = performance.now();
            frame = requestAnimationFrame(step);
          },
          progress ? 0 : SWEEP_DELAY_MS,
        );
      },
      () => {
        clearTimeout(wait);
        cancelAnimationFrame(frame);
      },
      0.55,
    );
    const listeners = new AbortController();
    const touch = () => {
      if (touched) return;
      touched = true;
      clearTimeout(wait);
      cancelAnimationFrame(frame);
      demo.done();
    };
    for (const type of ["pointerdown", "keydown", "focus"]) {
      input.addEventListener(type, touch, { signal: listeners.signal });
    }
    return () => {
      listeners.abort();
      demo.dispose();
      clearTimeout(wait);
      cancelAnimationFrame(frame);
    };
  }, []);

  const all = value >= RADIUS_MAX;
  const km = radiusKm(value);
  const inside = RADIUS_DOGS.filter((dog) => inRadius(value, dog.km)).length;

  return (
    <div
      ref={stageRef}
      className={className}
      data-reveal=""
      style={cssVars({ "--d": "120ms" })}
    >
      <figure className={s.map} aria-label={copy.figLabel}>
        <div className={s["map-plot"]}>
          {RINGS.map((ring) => (
            <span
              key={ring}
              className={s.ring}
              style={cssVars({ "--r": ringOf(ring).toFixed(2) })}
            >
              <i>{ring} km</i>
            </span>
          ))}
          <span
            className={s.disc}
            style={cssVars({ "--r": all ? 1 : ringOf(km).toFixed(4) })}
          />
          <span className={s.me} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
            </svg>
          </span>
          <span className={s["me-label"]} aria-hidden="true">
            {copy.you}
          </span>
          {RADIUS_DOGS.map((dog) => (
            <span
              key={dog.id}
              className={clsx(
                s.dot,
                dog.side === "right" && s["dot-r"],
                dog.side === "edge" && s["dot-far"],
                !inRadius(value, dog.km) && s["is-out"],
              )}
              style={cssVars({
                "--a": `${dog.angle}deg`,
                "--p": ringOf(dog.km).toFixed(3),
              })}
            >
              <img
                src={`/landing/${dog.id}.webp`}
                alt=""
                width={720}
                height={1028}
                loading="lazy"
              />
              <span className={s["dot-l"]}>
                <b>{dog.name}</b> {dog.km}km
              </span>
            </span>
          ))}
        </div>
        <figcaption className={s["map-note"]}>{copy.note}</figcaption>
      </figure>

      <div>
        <div className={s["dist-head"]}>
          <label htmlFor="ra-km">{copy.maxDist}</label>
          <span aria-hidden="true">1-300+ km</span>
        </div>
        <div
          className={s["dist-range"]}
          style={cssVars({ "--f": (value / RADIUS_MAX).toFixed(4) })}
        >
          <input
            ref={inputRef}
            id="ra-km"
            type="range"
            min={0}
            max={RADIUS_MAX}
            step={5}
            value={value}
            onChange={slide}
            aria-valuetext={
              all ? copy.noLimit : copy.upTo.replace("{km}", String(km))
            }
            aria-describedby="ra-count"
          />
          <output
            className={s["dist-bubble"]}
            htmlFor="ra-km"
            aria-hidden="true"
          >
            {all ? "300+" : km} km
          </output>
        </div>
      </div>
      <p className={s.count} id="ra-count" aria-live="polite">
        {parseRich(copy.counts[inside] ?? "").map((part) =>
          typeof part === "string" ? (
            part
          ) : (
            // A new number remounts, which replays its tick.
            <b key={inside} className={clsx(ticks && s.tick)}>
              {part.text}
            </b>
          ),
        )}
      </p>
    </div>
  );
};
