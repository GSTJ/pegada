import { useSyncExternalStore } from "react";

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
 * between the two frames while the screens cross-fade underneath.
 *
 * This is a tiny external store (no Redux/context needed) so both ends can
 * publish frames imperatively without re-rendering the whole tree.
 */

export interface HeroFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HeroSource {
  uri?: string;
  blurhash?: string | null;
}

export interface HeroState {
  /** dog id the transition belongs to; ties source and destination together. */
  id: string | null;
  source: HeroSource | null;
  /** measured swipe-card photo frame (start of the morph). */
  from: HeroFrame | null;
  /** measured DogProfile photo frame (end of the morph). set once it mounts. */
  to: HeroFrame | null;
  /** bumped every mutation so subscribers re-read. */
  version: number;
}

const initialState: HeroState = {
  id: null,
  source: null,
  from: null,
  to: null,
  version: 0,
};

let state: HeroState = initialState;

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
export const startHero = (args: { id: string; source: HeroSource; from: HeroFrame }) => {
  setState({ id: args.id, source: args.source, from: args.from, to: null });
};

/**
 * Provide the destination frame (the DogProfile photo, once measured). Ignored
 * if it doesn't match the in-flight hero's dog id, so a stale mount can't
 * hijack the animation.
 */
export const setHeroTarget = (args: { id: string; to: HeroFrame }) => {
  if (state.id !== args.id) return;
  setState({ to: args.to });
};

/** Clear the hero once the morph finishes (or is abandoned). */
export const endHero = () => {
  if (state.id === null) return;
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

/** True while a hero for `id` is active (used to hide the real photos). */
export const useIsHeroActive = (id: string | undefined): boolean => {
  const current = useHeroState();
  return Boolean(id) && current.id === id;
};
