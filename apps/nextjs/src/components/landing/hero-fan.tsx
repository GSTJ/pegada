"use client";

import type { ReactNode } from "react";

import { useEffect, useRef } from "react";

import { prefersReducedMotion } from "./while-seen";

/** Spring constants for the lean: stiff enough to follow, damped so it never wobbles. */
const STIFFNESS = 140;
const DAMPING = 22;

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * The two cards lean toward a mouse anywhere over the hero, on a spring, by
 * writing `--tx`/`--ty` (-1..1) for the CSS transforms to read. Touch,
 * coarse pointers and reduced motion get the still fan.
 */
export const HeroFan = ({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) => {
  const fanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fan = fanRef.current;
    const hero = fan?.closest("section");
    if (
      !fan ||
      !hero ||
      !matchMedia("(hover: hover) and (pointer: fine)").matches ||
      prefersReducedMotion()
    ) {
      return;
    }
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016);
      last = now;
      vx += (STIFFNESS * (targetX - x) - DAMPING * vx) * dt;
      x += vx * dt;
      vy += (STIFFNESS * (targetY - y) - DAMPING * vy) * dt;
      y += vy * dt;
      fan.style.setProperty("--tx", x.toFixed(4));
      fan.style.setProperty("--ty", y.toFixed(4));
      const moving =
        Math.abs(targetX - x) +
          Math.abs(targetY - y) +
          Math.abs(vx) +
          Math.abs(vy) >
        0.0008;
      frame = moving ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = fan.getBoundingClientRect();
      targetX = clamp(
        (event.clientX - (rect.left + rect.width / 2)) / (rect.width * 1.6),
      );
      targetY = clamp(
        (event.clientY - (rect.top + rect.height / 2)) / (rect.height * 1.4),
      );
      kick();
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
      kick();
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={fanRef} className={className} aria-hidden="true">
      {children}
    </div>
  );
};
