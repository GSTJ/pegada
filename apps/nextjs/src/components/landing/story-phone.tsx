"use client";

import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { clsx } from "clsx";

import { prefersReducedMotion, whileSeen } from "./while-seen";

import s from "./story.module.css";

const STORY_MS = 6000;
const STORY_DELAY_MS = 700;

/**
 * Section 05's phone: the story's progress bar plays once while it is on
 * screen, and pauses under the mouse, on focus, or while held. Holding (a
 * press, or Space) also steps the story chrome aside so the art reads
 * clean, with or without motion.
 */
export const StoryPhone = ({
  className,
  label,
  children,
}: {
  className: string;
  label: string;
  children: ReactNode;
}) => {
  const phoneRef = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const phone = phoneRef.current;
    const bar = phone?.querySelector<HTMLElement>("[data-bar]");
    if (!phone || !bar) return;
    const listeners = new AbortController();
    const { signal } = listeners;
    let isHeld = false;
    let sync = () => {};
    let stop = () => {};
    if (!prefersReducedMotion()) {
      const run = bar.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        {
          duration: STORY_MS,
          delay: STORY_DELAY_MS,
          easing: "linear",
          fill: "both",
        },
      );
      run.pause();
      let seen = false;
      let hover = false;
      let focus = false;
      sync = () => {
        if (run.playState === "finished") return;
        if (seen && !hover && !focus && !isHeld && !document.hidden) run.play();
        else run.pause();
      };
      const demo = whileSeen(
        phone,
        () => {
          seen = true;
          sync();
        },
        () => {
          seen = false;
          sync();
        },
        0.5,
      );
      // A cancelled run rejects; that only happens on unmount.
      run.finished.then(() => demo.done()).catch(() => {});
      phone.addEventListener(
        "pointerenter",
        (event) => {
          if (event.pointerType !== "mouse") return;
          hover = true;
          sync();
        },
        { signal },
      );
      phone.addEventListener(
        "pointerleave",
        () => {
          hover = false;
          sync();
        },
        { signal },
      );
      phone.addEventListener(
        "focus",
        () => {
          focus = true;
          sync();
        },
        { signal },
      );
      phone.addEventListener(
        "blur",
        () => {
          focus = false;
          sync();
        },
        { signal },
      );
      document.addEventListener("visibilitychange", () => sync(), { signal });
      stop = () => {
        demo.dispose();
        run.cancel();
      };
    }

    const hold = (on: boolean) => {
      isHeld = on;
      setHeld(on);
      sync();
    };
    phone.addEventListener(
      "pointerdown",
      (event) => {
        phone.setPointerCapture(event.pointerId);
        hold(true);
      },
      { signal },
    );
    phone.addEventListener("pointerup", () => hold(false), { signal });
    phone.addEventListener("pointercancel", () => hold(false), { signal });
    phone.addEventListener("contextmenu", (event) => event.preventDefault(), {
      signal,
    });
    phone.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== " " || event.repeat) return;
        event.preventDefault();
        hold(true);
      },
      { signal },
    );
    phone.addEventListener(
      "keyup",
      (event) => {
        if (event.key === " ") hold(false);
      },
      { signal },
    );

    return () => {
      listeners.abort();
      stop();
    };
  }, []);

  return (
    <div
      ref={phoneRef}
      className={clsx(className, held && s["is-held"])}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- Space holds the story, like a press does.
      tabIndex={0}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a screen drawn from many elements, read as one picture with one name.
      role="img"
      aria-label={label}
    >
      {children}
    </div>
  );
};
