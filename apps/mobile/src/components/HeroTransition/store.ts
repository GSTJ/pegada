import { useSyncExternalStore } from "react";

import type { SwipeDog } from "@/store/reducers/dogs/swipe";

/**
 * Manual shared-element ("hero") transition for the swipe-card -> DogProfile
 * photo morph.
 *
 * Why not Reanimated's `sharedTransitionTag`? Reanimated 4.3's shared-element
 * transitions are driven entirely by react-native-screens' native
 * `onTransitionProgress` event, which is only emitted when screens render
 * through `ReanimatedScreenProvider`. expo-router never wraps its navigator in
 * that provider, so the event never reaches Reanimated and the tag does
 * nothing (you just get the plain stack "fade"). Rather than fork the router's
 * screen tree, we drive the morph ourselves: measure the card photo on tap,
 * measure the profile photo when it mounts, and animate an overlay image
 * between the two frames while navigation swaps the routes underneath.
 *
 * This is a tiny external store (no Redux/context needed) so both ends can
 * publish frames imperatively without re-rendering the whole tree.
 */

export interface HeroFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
}

export interface HeroSource {
  uri?: string;
  blurhash?: string | null;
}

export interface HeroChrome {
  dog: SwipeDog;
  pages: number;
  currentPage: number;
}

export interface HeroState {
  /** dog id the transition belongs to; ties source and destination together. */
  id: string | null;
  source: HeroSource | null;
  /** Card chrome that is genuinely shared by both ends of the transition. */
  chrome: HeroChrome | null;
  phase: "forward" | "reverse" | null;
  /** measured swipe-card photo frame (start of the morph). */
  from: HeroFrame | null;
  /** measured DogProfile photo frame (end of the morph). set once it mounts. */
  to: HeroFrame | null;
  actionFrom: HeroFrame | null;
  actionTo: HeroFrame | null;
  /**
   * True once the flying overlay image has actually painted (expo-image
   * `onDisplay`). The real photos underneath only hide from this point on --
   * hiding them on `startHero` left a 1-2 frame blank flash while the overlay
   * image decoded.
   */
  overlayReady: boolean;
  /** bumped every mutation so subscribers re-read. */
  version: number;
}

const initialState: HeroState = {
  id: null,
  source: null,
  chrome: null,
  phase: null,
  from: null,
  to: null,
  actionFrom: null,
  actionTo: null,
  overlayReady: false,
  version: 0,
};

let state: HeroState = initialState;
let settledHero: HeroState | null = null;
let reverseCompletions: Array<() => void> = [];
let reverseHandoffPending = false;
const sourceActionFrames = new Map<string, HeroFrame>();

const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const setState = (next: Partial<HeroState>) => {
  state = { ...state, ...next, version: state.version + 1 };
  emit();
};

/**
 * Begin a hero transition. Called from the swipe card the moment the user taps
 * to open a profile, with the tapped photo's measured frame and source. The
 * destination frame arrives later via {@link setHeroTarget}.
 */
export const startHero = (args: {
  id: string;
  source: HeroSource;
  from: HeroFrame;
  chrome?: HeroChrome;
}) => {
  // A new navigation attempt supersedes every previously completed hero,
  // including one for the same dog. Until this forward transition itself
  // lands, there must be nothing reversible: an immediate Back or a timeout
  // cannot resurrect geometry from an older Swipe/Profile visit.
  settledHero = null;
  setState({
    id: args.id,
    source: args.source,
    chrome: args.chrome ?? null,
    phase: "forward",
    from: args.from,
    to: null,
    // Only Swipe heroes carry card chrome/action controls. A Chat avatar can
    // share a dog id with an earlier Swipe card, but must never inherit that
    // process-lifetime action frame and wait for a target it does not render.
    actionFrom: args.chrome ? (sourceActionFrames.get(args.id) ?? null) : null,
    actionTo: null,
    overlayReady: false,
  });
};

const MEASURE_WATCHDOG_MS = 250;

/**
 * Navigation must not depend indefinitely on a native measurement callback:
 * refs can be null during teardown and native callbacks are not guaranteed to
 * arrive. The returned function wins exactly once; a valid measurement can
 * prepare a hero before navigating, otherwise the watchdog takes the normal
 * non-hero route.
 */
export const createHeroNavigationWatchdog = (
  navigate: (heroTransition?: string) => void,
): ((prepareHero?: () => void) => void) => {
  let completed = false;

  const complete = (prepareHero?: () => void) => {
    if (completed) return;
    completed = true;
    clearTimeout(timer);
    prepareHero?.();
    navigate(prepareHero ? "1" : undefined);
  };

  const timer = setTimeout(complete, MEASURE_WATCHDOG_MS);
  return complete;
};

/** Called by the overlay image's `onDisplay` -- it has pixels on screen. */
export const markHeroOverlayReady = () => {
  if (state.id === null || state.overlayReady) return;
  setState({ overlayReady: true });
};

/**
 * Provide the destination frame (the DogProfile photo, once measured). Ignored
 * if it doesn't match the in-flight hero's dog id, so a stale mount can't
 * hijack the animation.
 */
export const setHeroTarget = (args: { id: string; to: HeroFrame }) => {
  if (state.id !== args.id || state.phase !== "forward") return;
  setState({ to: args.to });
};

export const registerHeroActionFrame = (args: {
  id: string;
  role: "source" | "target";
  frame: HeroFrame;
}) => {
  if (args.role === "source") {
    sourceActionFrames.set(args.id, args.frame);
    if (state.id === args.id && state.phase === "forward" && state.chrome) {
      setState({ actionFrom: args.frame });
    }
    return;
  }

  if (state.id === args.id && state.phase === "forward" && state.chrome) {
    setState({ actionTo: args.frame });
  }
  if (settledHero?.id === args.id && settledHero.chrome) {
    settledHero = { ...settledHero, actionTo: args.frame };
  }
};

export const unregisterHeroSourceActionFrame = (id: string) => {
  sourceActionFrames.delete(id);
};

/** Shared-element readiness is deliberately photo-only outside Swipe. */
export const areHeroSharedElementsReady = (hero: HeroState): boolean =>
  Boolean(hero.to) && (!hero.chrome || !hero.actionFrom || Boolean(hero.actionTo));

/** Imperative snapshot for deterministic store verification. */
export const getHeroStateSnapshot = (): HeroState => state;

/**
 * Generation token for native measurements whose callbacks may arrive after
 * React cleanup. Both the queued RAF and the native callback must hold the
 * currently active token before they can publish geometry.
 */
export const createHeroMeasurementLifecycle = () => {
  let nextGeneration = 0;
  let activeGeneration: number | null = null;

  return {
    activate: () => {
      activeGeneration = ++nextGeneration;
      return activeGeneration;
    },
    invalidate: () => {
      activeGeneration = null;
      nextGeneration++;
    },
    current: () => activeGeneration,
    isCurrent: (generation: number) => activeGeneration === generation,
  };
};

/** Clear an incomplete forward hero without publishing a reverse snapshot. */
export const abandonHero = (id: string) => {
  if (state.id !== id || state.phase !== "forward") return;
  settledHero = null;
  state = { ...initialState, version: state.version + 1 };
  emit();
};

export const startReverseHero = (id: string, onComplete?: () => void): boolean => {
  if (state.id === id && state.phase === "reverse") {
    if (onComplete) reverseCompletions.push(onComplete);
    return true;
  }

  // Back can arrive before the forward morph has landed and published its
  // reversible snapshot. Let navigation pop normally, but remove the
  // unfinished overlay first so it cannot keep flying over the source screen
  // or later publish stale geometry for a route that is already gone.
  if (state.id === id && state.phase === "forward") {
    abandonHero(id);
    return false;
  }

  if (!settledHero || settledHero.id !== id || !settledHero.from || !settledHero.to) return false;

  reverseCompletions = onComplete ? [onComplete] : [];
  const previous = settledHero;
  setState({
    id,
    source: previous.source,
    chrome: previous.chrome,
    phase: "reverse",
    from: previous.to,
    to: previous.from,
    actionFrom: previous.actionTo,
    actionTo: previous.actionFrom,
    overlayReady: false,
  });
  return true;
};

/** Clear the hero once the morph finishes (or is abandoned). */
export const endHero = () => {
  if (state.id === null) return;
  const finished = state;

  if (finished.phase === "reverse") {
    if (reverseHandoffPending) return;
    reverseHandoffPending = true;

    const completions = reverseCompletions;
    reverseCompletions = [];
    for (const completion of completions) completion();

    // The reverse overlay has landed on the source frame, but the held route
    // removal has not committed visually yet. Keep that landed overlay alive
    // while navigation exposes the source and its real shared elements mount;
    // only then hand visibility back. Clearing before dispatch produced one
    // blank frame followed by a duplicate profile/source frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (state.id === finished.id && state.phase === "reverse") {
          state = { ...initialState, version: state.version + 1 };
          emit();
        }
        reverseHandoffPending = false;
      });
    });
    return;
  }

  if (finished.phase === "forward" && finished.to) {
    settledHero = { ...finished, overlayReady: false };
  }
  state = { ...initialState, version: state.version + 1 };
  emit();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => state;

export const useHeroState = (): HeroState => useSyncExternalStore(subscribe, getSnapshot);

/**
 * True while a hero for `id` is active AND its overlay has painted (used to
 * hide the real photos). Gating on `overlayReady` keeps the originals visible
 * for the couple of frames the overlay image needs to decode, so the morph
 * starts without a blank flash.
 */
export const useIsHeroActive = (id: string | undefined): boolean => {
  const current = useHeroState();
  return Boolean(id) && current.id === id && current.phase !== null && current.overlayReady;
};
