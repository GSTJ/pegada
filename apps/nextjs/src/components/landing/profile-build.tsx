"use client";

import type { ReactNode } from "react";

import { useEffect, useRef } from "react";

import { prefersReducedMotion } from "./while-seen";

import s from "./profile.module.css";

const c = (name: string) => s[name] ?? name;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** A computed length like "630px" as a number. */
const px = (value: string) => Number(value.replace("px", "")) || 0;

/** Where each field starts filling in, as a share of the section's scroll. */
const STEPS = [
  ["foto", 0.04],
  ["nome", 0.16],
  ["idade", 0.32],
  ["raca", 0.46],
  ["bio", 0.62],
  ["tail", 0.82],
] as const;
const END = 0.88;

/**
 * Section 01. Scrolling through the section fills Lua's profile in, field by
 * field (photo, typed name, birthday turning into an age, the breed, the
 * bio word by word, then the buttons), and the matching row on the left
 * ticks. On a tall desktop the whole split pins while it builds; elsewhere the
 * phone's own trip up the screen drives it. Scrolling back reverses it. With
 * reduced motion or no JS the profile is simply complete.
 */
export const ProfileBuild = ({
  className,
  children,
}: {
  className: string | undefined;
  children: ReactNode;
}) => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const find = (selector: string) =>
      section?.querySelector<HTMLElement>(selector) ?? undefined;
    const pv = find("[data-build]");
    const pin = find("[data-pin]");
    const stage = find("[data-stage]");
    const photo = find('[data-a="foto"]');
    const name = find("[data-type]");
    const age = find('[data-a="idade"]');
    const breed = find('[data-a="raca"]');
    const bio = find("[data-words]");
    if (
      !section ||
      !pv ||
      !pin ||
      !stage ||
      !photo ||
      !name ||
      !age ||
      !breed ||
      !bio ||
      prefersReducedMotion()
    ) {
      return;
    }
    const tail = [...pv.querySelectorAll<HTMLElement>('[data-a="tail"]')];
    const rows = [...section.querySelectorAll<HTMLElement>("[data-k]")];
    const NAME = name.textContent ?? "";
    const words = bio.children.length;

    const setText = (el: HTMLElement, text: string) => {
      if (el.textContent !== text) el.textContent = text;
    };
    const render = (progress: number) => {
      const sub = (index: number) => {
        const start = STEPS[index]?.[1] ?? 1;
        return clamp01(
          (progress - start) / ((STEPS[index + 1]?.[1] ?? END) - start),
        );
      };
      const [foto, nome, idade, raca, words01, rest] = STEPS.map((_, index) =>
        sub(index),
      ) as [number, number, number, number, number, number];

      photo.classList.toggle(c("on"), foto > 0);

      const typed = Math.min(NAME.length, Math.ceil(nome * 1.3 * NAME.length));
      name.classList.toggle(c("on"), nome > 0);
      name.classList.toggle(c("typing"), nome > 0 && typed < NAME.length);
      setText(name, nome > 0 ? NAME.slice(0, typed) : NAME);

      age.classList.toggle(c("is-date"), idade > 0 && idade < 0.5);
      age.classList.toggle(c("on"), idade >= 0.5);

      breed.classList.toggle(c("on"), raca > 0);
      breed.classList.toggle(c("pop"), raca > 0);

      bio.classList.toggle(c("on"), words01 > 0);
      bio.style.setProperty(
        "--k",
        words01 > 0 ? (words01 * 1.2 * words).toFixed(2) : "99",
      );

      for (const el of tail) el.classList.toggle(c("on"), rest > 0);

      for (const [at, row] of rows.entries()) {
        const value = sub(at);
        row.classList.toggle(c("is-now"), value > 0 && value < 1);
        row.classList.toggle(c("is-done"), value >= 1);
      }
    };

    let pinned = false;
    let track = 0;
    let padTop = 0;
    let barH = 0;
    const measure = () => {
      const style = getComputedStyle(pin);
      pinned = style.position === "sticky";
      track = px(getComputedStyle(section, "::after").height);
      barH = px(style.top);
      padTop = px(getComputedStyle(section).paddingTop);
    };
    const progress = () => {
      const vh = innerHeight;
      if (pinned) {
        // From a little before the split pins until it lets go.
        const lead = vh * 0.45;
        const held = barH - (section.getBoundingClientRect().top + padTop);
        return clamp01((held + lead) / (track + lead));
      }
      const rect = stage.getBoundingClientRect();
      const begin = vh * 0.8;
      const end = Math.max(barH, (vh - rect.height) / 2);
      return clamp01((begin - rect.top) / Math.max(1, begin - end));
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      render(progress());
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = () => {
      measure();
      schedule();
    };

    pv.classList.add(c("is-armed"));
    section.classList.add(c("is-building"));
    measure();
    update();
    const listeners = new AbortController();
    const { signal } = listeners;
    addEventListener("scroll", schedule, { passive: true, signal });
    addEventListener("resize", resize, { signal });

    return () => {
      listeners.abort();
      cancelAnimationFrame(frame);
      render(1);
      pv.classList.remove(c("is-armed"));
      section.classList.remove(c("is-building"));
    };
  }, []);

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
