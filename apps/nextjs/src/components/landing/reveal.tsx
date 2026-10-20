"use client";

import { useEffect } from "react";

/**
 * Fades `[data-reveal]` blocks in the first time they scroll into view. The
 * hidden state only exists once this has run (`data-reveal-ready` on
 * `<html>`), so without JS, or if this chunk never loads, every block is
 * simply there. Blocks already on screen when it starts are marked shown in
 * the same tick, so nothing visible disappears at hydration.
 */
export const Reveal = () => {
  useEffect(() => {
    const blocks = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries.filter((item) => item.isIntersecting)) {
          (entry.target as HTMLElement).dataset.revealed = "";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const fold = innerHeight * 0.92;
    for (const block of blocks) {
      if (block.getBoundingClientRect().top < fold) block.dataset.revealed = "";
      else observer.observe(block);
    }
    document.documentElement.dataset.revealReady = "";
    return () => {
      observer.disconnect();
      delete document.documentElement.dataset.revealReady;
    };
  }, []);

  return null;
};
