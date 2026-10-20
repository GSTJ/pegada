/**
 * Every looping or scripted demo on the page registers here. Of the ones on
 * screen, only the one nearest the viewport's center runs, so two demos never
 * play against each other. A finished one-shot calls `done()` and stops
 * competing. With reduced motion nothing registers: the markup is the
 * finished frame.
 */
type Demo = {
  el: Element;
  start: () => void;
  stop: () => void;
  threshold: number;
  seen: boolean;
  on: boolean;
  done: boolean;
};

const demos: Demo[] = [];
let observer: IntersectionObserver | undefined;
let scrollFrame = 0;

const arbitrate = () => {
  const mid = innerHeight / 2;
  let pick: Demo | undefined;
  let best = Infinity;
  if (!document.hidden) {
    for (const demo of demos.filter(
      (candidate) => candidate.seen && !candidate.done,
    )) {
      const rect = demo.el.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - mid);
      if (distance < best) {
        best = distance;
        pick = demo;
      }
    }
  }
  for (const demo of demos.filter(
    (candidate) => (candidate === pick) !== candidate.on,
  )) {
    demo.on = !demo.on;
    if (demo.on) demo.start();
    else demo.stop();
  }
};

const onScroll = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (demos.filter((demo) => demo.seen && !demo.done).length > 1) arbitrate();
  });
};

const ensureObserver = () => {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const demo = demos.find((candidate) => candidate.el === entry.target);
        if (demo) {
          // A demo taller than the viewport can never be 50% visible, so the
          // bar drops to what fits.
          const need = Math.min(
            demo.threshold,
            (innerHeight / Math.max(1, entry.boundingClientRect.height)) * 0.9,
          );
          demo.seen = entry.isIntersecting && entry.intersectionRatio >= need;
        }
      }
      arbitrate();
    },
    { threshold: [0, 0.1, 0.2, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] },
  );
  addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("visibilitychange", arbitrate);
  return observer;
};

export const prefersReducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;

export const whileSeen = (
  el: Element,
  start: () => void,
  stop: () => void,
  threshold = 0.35,
) => {
  if (prefersReducedMotion()) {
    return { done: () => {}, again: () => {}, dispose: () => {} };
  }
  const demo: Demo = {
    el,
    start,
    stop,
    threshold,
    seen: false,
    on: false,
    done: false,
  };
  demos.push(demo);
  ensureObserver().observe(el);
  return {
    done: () => {
      demo.done = true;
      demo.on = false;
      arbitrate();
    },
    again: () => {
      demo.done = false;
      arbitrate();
    },
    dispose: () => {
      observer?.unobserve(el);
      demos.splice(demos.indexOf(demo), 1);
      if (demo.on) demo.stop();
      arbitrate();
    },
  };
};
