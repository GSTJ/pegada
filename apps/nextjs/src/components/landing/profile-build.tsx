"use client";

import type { ReactNode } from "react";

import { useEffect, useRef } from "react";

import { prefersReducedMotion, whileSeen } from "./while-seen";

import s from "./profile.module.css";

const c = (name: string) => s[name] ?? name;

/** Gaps between the breeds the pill rolls through, slowing into Lua's. */
const ROLL_GAP = [0, 110, 105, 120, 160, 230];

/**
 * Section 01. While the phone is on screen, Lua's profile fills in field by
 * field (photo, typed name, birthday turning into an age, a breed roll, the
 * bio word by word, then the buttons) and the matching row on the left ticks.
 * It plays once; hovering pauses it, the button replays it. With reduced
 * motion the profile is simply complete.
 */
export const ProfileBuild = ({
  className,
  roll,
  children,
}: {
  className: string | undefined;
  roll: string[];
  children: ReactNode;
}) => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const find = (selector: string) =>
      section?.querySelector<HTMLElement>(selector) ?? undefined;
    const pv = find("[data-build]");
    const stage = find("[data-stage]");
    const replay = find("[data-replay]");
    const photo = find('[data-a="foto"]');
    const name = find("[data-type]");
    const age = find('[data-a="idade"]');
    const breed = find('[data-a="raca"]');
    const rolling = find("[data-roll]");
    const bio = find("[data-words]");
    if (
      !section ||
      !pv ||
      !stage ||
      !replay ||
      !photo ||
      !name ||
      !age ||
      !breed ||
      !rolling ||
      !bio
    ) {
      return;
    }
    const tail = [...pv.querySelectorAll<HTMLElement>('[data-a="tail"]')];
    const facts = new Map(
      [...section.querySelectorAll<HTMLElement>("[data-k]")].map((row) => [
        row.dataset.k,
        row,
      ]),
    );
    const NAME = name.textContent ?? "";
    const BREED = rolling.textContent ?? "";
    const parts = [photo, name, age, breed, bio, ...tail];

    const now = (key: string) => {
      for (const [k, row] of facts)
        row.classList.toggle(c("is-now"), k === key);
    };
    const done = (key: string) => {
      facts.get(key)?.classList.remove(c("is-now"));
      facts.get(key)?.classList.add(c("is-done"));
    };

    const events: [number, () => void][] = [];
    const at = (time: number, run: () => void) => events.push([time, run]);
    at(250, () => {
      now("foto");
      photo.classList.add(c("on"));
    });
    at(1150, () => done("foto"));
    at(1250, () => {
      now("nome");
      name.classList.add(c("on"), c("typing"));
      name.textContent = "";
    });
    for (const [index, char] of [...NAME].entries()) {
      at(1450 + index * 120, () => {
        name.textContent += char;
      });
    }
    at(1450 + NAME.length * 120 + 200, () => {
      name.classList.remove(c("typing"));
      done("nome");
    });
    at(2050, () => {
      now("idade");
      age.classList.add(c("is-date"));
    });
    at(2950, () => {
      age.classList.remove(c("is-date"));
      age.classList.add(c("on"));
    });
    at(3350, () => done("idade"));
    let time = 3550;
    at(time, () => {
      now("raca");
      breed.classList.add(c("on"));
    });
    for (const [index, gap] of ROLL_GAP.entries()) {
      time += gap;
      at(time, () => {
        rolling.textContent = roll[index] ?? BREED;
        rolling.classList.remove(c("roll-in"));
        void rolling.offsetWidth;
        rolling.classList.add(c("roll-in"));
      });
    }
    at(time + 10, () => breed.classList.add(c("pop")));
    at(time + 500, () => done("raca"));
    at(time + 650, () => {
      now("bio");
      bio.classList.add(c("on"));
      requestAnimationFrame(() =>
        requestAnimationFrame(() => bio.classList.add(c("shown"))),
      );
    });
    at(time + 1500, () => done("bio"));
    at(time + 1650, () => {
      for (const el of tail) el.classList.add(c("on"));
    });
    at(time + 2400, () => {
      section.classList.remove(c("is-building"));
      demo.done();
    });
    events.sort((a, b) => a[0] - b[0]);

    let elapsed = 0;
    let next = 0;
    let seen = false;
    let hovering = false;
    let frame = 0;
    let previous = 0;
    const clear = () => {
      for (const el of parts) {
        el.classList.remove(
          c("on"),
          c("is-date"),
          c("shown"),
          c("typing"),
          c("pop"),
        );
      }
      for (const row of facts.values()) {
        row.classList.remove(c("is-now"), c("is-done"));
      }
      name.textContent = NAME;
      rolling.textContent = BREED;
    };
    const arm = () => {
      pv.classList.add(c("is-armed"));
      section.classList.add(c("is-building"));
      clear();
      elapsed = 0;
      next = 0;
    };
    const loop = (stamp: number) => {
      if (seen && !hovering) {
        elapsed += Math.min(64, stamp - previous);
        while (next < events.length && (events[next]?.[0] ?? 0) <= elapsed) {
          events[next++]?.[1]();
        }
      }
      previous = stamp;
      frame = seen && next < events.length ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (frame || next >= events.length) return;
      previous = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const demo = whileSeen(
      stage,
      () => {
        seen = true;
        kick();
      },
      () => {
        seen = false;
      },
      0.5,
    );

    const listeners = new AbortController();
    const { signal } = listeners;
    if (!prefersReducedMotion()) {
      arm();
      stage.addEventListener(
        "pointerenter",
        (event) => {
          if (event.pointerType === "mouse") hovering = true;
        },
        { signal },
      );
      stage.addEventListener(
        "pointerleave",
        () => {
          hovering = false;
        },
        { signal },
      );
    }
    replay.addEventListener(
      "click",
      () => {
        if (prefersReducedMotion()) return;
        arm();
        demo.again();
        // Let the empty frame paint before the build restarts.
        requestAnimationFrame(() => requestAnimationFrame(kick));
      },
      { signal },
    );

    return () => {
      listeners.abort();
      demo.dispose();
      cancelAnimationFrame(frame);
      clear();
      pv.classList.remove(c("is-armed"));
      section.classList.remove(c("is-building"));
    };
  }, [roll]);

  return (
    <section
      ref={sectionRef}
      className={className}
      id="como-funciona"
      data-nav="como-funciona"
      aria-labelledby="pf-title"
    >
      {children}
    </section>
  );
};
