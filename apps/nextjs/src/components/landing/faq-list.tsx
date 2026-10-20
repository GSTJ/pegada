"use client";

import type { CSSProperties, ReactNode } from "react";

import { useEffect, useRef } from "react";

import { prefersReducedMotion } from "./while-seen";

const EASE_OUT = "cubic-bezier(.23, 1, .32, 1)";

/**
 * The FAQ's native `<details>` share `name`, so the browser already keeps one
 * open at a time. With motion allowed this takes that over to animate it:
 * height on the item, the answer fading in, and the sibling closing as the
 * new one opens.
 */
export const FaqList = ({
  className,
  style,
  children,
}: {
  className?: string;
  style: CSSProperties;
  children: ReactNode;
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list || prefersReducedMotion()) return;
    const items = [...list.querySelectorAll<HTMLDetailsElement>("details")];
    const names = items.map((item) => item.getAttribute("name"));
    for (const item of items) item.removeAttribute("name");
    const wantOpen = new Map(items.map((item) => [item, item.open]));
    const anims = new Map<HTMLDetailsElement, Animation[]>();
    const listeners = new AbortController();

    const run = (item: HTMLDetailsElement, opening: boolean) => {
      const summary = item.querySelector("summary");
      const answer = item.querySelector<HTMLElement>("[data-answer]");
      if (!summary || !answer) return;
      const from = item.getBoundingClientRect().height;
      for (const anim of anims.get(item) ?? []) anim.cancel();
      if (opening) item.open = true;
      const to = opening
        ? summary.offsetHeight + answer.offsetHeight
        : summary.offsetHeight;
      item.style.overflow = "hidden";
      const height = item.animate(
        { height: [`${from}px`, `${to}px`] },
        { duration: opening ? 340 : 260, easing: EASE_OUT },
      );
      const fade = opening
        ? answer.animate(
            {
              opacity: [0, 1],
              translate: ["0 -6px", "0 0"],
              filter: ["blur(3px)", "blur(0)"],
            },
            { duration: 300, delay: 60, easing: EASE_OUT, fill: "backwards" },
          )
        : answer.animate(
            { opacity: [1, 0] },
            { duration: 140, easing: "ease-out", fill: "forwards" },
          );
      anims.set(item, [height, fade]);
      height.onfinish = () => {
        if (!opening) item.open = false;
        fade.cancel();
        item.style.overflow = "";
        anims.delete(item);
      };
    };

    for (const item of items) {
      item.querySelector("summary")?.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          const opening = !wantOpen.get(item);
          wantOpen.set(item, opening);
          if (opening) {
            for (const other of items) {
              if (other !== item && wantOpen.get(other)) {
                wantOpen.set(other, false);
                run(other, false);
              }
            }
          }
          run(item, opening);
        },
        { signal: listeners.signal },
      );
    }

    return () => {
      listeners.abort();
      for (const [index, item] of items.entries()) {
        const name = names[index];
        if (name) item.setAttribute("name", name);
      }
      for (const list of anims.values()) for (const anim of list) anim.cancel();
    };
  }, []);

  return (
    <div ref={listRef} className={className} data-reveal="" style={style}>
      {children}
    </div>
  );
};
