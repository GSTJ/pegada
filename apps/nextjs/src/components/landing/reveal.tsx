"use client";

import { useEffect } from "react";

/**
 * The page's one reveal observer. Mount it once per page; it renders nothing.
 *
 * Mark a block with `data-reveal` and its parts with `data-role` (`title`,
 * `lede`, `body`, `card`, `action`, `stamp`); `globals.css` turns the roles
 * into one choreography. Each block reveals once, when its top crosses 88% of
 * the viewport, and gets `data-revealed`, which a section can also key its
 * own one-time effects off (`group-data-[revealed]:…`). Stagger cards with
 * `staggerStyle` (`./stagger.ts`).
 *
 * Blocks already on screen when this mounts are marked revealed in the same
 * tick the hidden state switches on, so the first paint never blinks.
 */
export const Reveal = () => {
  useEffect(() => {
    const root = document.documentElement;
    const blocks = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const reveal = (block: HTMLElement) => {
      block.dataset.revealed = "";
    };

    for (const block of blocks) {
      if (block.getBoundingClientRect().top < window.innerHeight) reveal(block);
    }
    root.dataset.revealReady = "";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            reveal(entry.target);
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    for (const block of blocks) {
      if (!("revealed" in block.dataset)) observer.observe(block);
    }

    return () => {
      observer.disconnect();
      delete root.dataset.revealReady;
    };
  }, []);

  return null;
};
