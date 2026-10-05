import { useSyncExternalStore } from "react";

import { NO_HERO_SHADOW, type HeroShadow } from "@/components/MainCard/heroShadow";
import type { SwipeDog } from "@/store/reducers/dogs/swipe";

/**
 * Manual shared-element ("hero") transition for the swipe-card -> DogProfile
 * photo morph.
 *
 * Reanimated 4.3's shared-element implementation is still experimental and
 * compile-time gated. Its Fabric path also does not reliably support our
 * source inside a Tab navigator or the transparent-modal destination. A Router
 * provider patch would leave those constraints in place and would not cover
 * the photo, shadow, pagination, distance, title, bio, and action choreography
 * as one reversible transition. We measure both surfaces and animate that
 * shared overlay explicitly while navigation swaps the routes underneath.
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

/**
 * Pixels shared by the source card/avatar and DogProfile must stay immutable
 * for the lifetime of a reversible Hero snapshot. Object identity is not
 * sufficient because React Query can publish equivalent clones, so compare a
 * deterministic value fingerprint instead.
 */
export interface HeroSharedContentStrings {
  locale: string;
  formattedAge: string | null;
  formattedDistance: string | null;
}

export const getHeroSharedContentFingerprint = (
  dog: SwipeDog,
  sharedStrings: HeroSharedContentStrings,
): string => {
  const birthDateTimestamp = dog.birthDate ? new Date(dog.birthDate).getTime() : null;

  return JSON.stringify([
    dog.id,
    dog.name,
    Number.isFinite(birthDateTimestamp) ? birthDateTimestamp : null,
    dog.bio ?? null,
    dog.distance ?? null,
    dog.breed?.slug ?? null,
    sharedStrings.locale,
    sharedStrings.formattedAge,
    sharedStrings.formattedDistance,
    dog.images.map((image) => [image.id, image.url, image.blurhash ?? null]),
  ]);
};

export type HeroBottomSurfaceLocations = [number, number, number, number];

export interface HeroTitle {
  name: string;
  age: string | null;
}

export interface HeroBio {
  text: string;
  numberOfLines: number;
}

export type HeroSourceKind = "swipe" | "chat";
export interface HeroSourceOwner {
  id: string;
  sourceKind: HeroSourceKind;
}
export type HeroPhotoSessionToken = string;
export type HeroPhotoSourceInstanceToken = string;

export interface HeroPhotoSelection {
  id: string;
  sessionToken: HeroPhotoSessionToken;
  sourceInstanceToken: HeroPhotoSourceInstanceToken;
  index: number;
  imageKey: string;
  generation: number;
  source: HeroSource;
}

export interface HeroPhotoRenderState {
  index: number;
  generation: number;
}

interface HeroPhotoIdentity {
  id?: string | null;
  url?: string | null;
}

export const advanceHeroPhotoRenderState = (
  index: number,
  generation: number,
): HeroPhotoRenderState => ({ index, generation: generation + 1 });

export const getHeroPhotoRenderKey = (imageKey: string | undefined, generation: number) =>
  `${imageKey}:${generation}`;

export const getHeroPhotoEntrySnapshot = <Photo>(
  state: HeroPhotoRenderState,
  photos: readonly Photo[],
) => ({ ...state, photo: photos[state.index] });

/**
 * Keep an explicit photo selection attached to its image identity when a
 * route-stable query publishes a reordered array. If the image disappeared,
 * choose the nearest valid slot and advance the native paint generation so a
 * remove/re-add A→B→A sequence cannot reuse stale pixels.
 */
export const reconcileHeroPhotoRenderState = <Photo extends HeroPhotoIdentity>(
  state: HeroPhotoRenderState,
  previousPhotos: readonly Photo[],
  nextPhotos: readonly Photo[],
): HeroPhotoRenderState => {
  if (nextPhotos.length === 0) {
    return state.index === 0 ? state : advanceHeroPhotoRenderState(0, state.generation);
  }

  const previousPhoto = previousPhotos[state.index];
  const previousKey = previousPhoto?.id ?? previousPhoto?.url;
  if (previousKey) {
    const exactIndex = nextPhotos.findIndex((photo) => (photo.id ?? photo.url) === previousKey);
    if (exactIndex >= 0) {
      const exactPhoto = nextPhotos[exactIndex];
      const sourceChanged = previousPhoto?.url !== exactPhoto?.url;
      if (exactIndex === state.index && !sourceChanged) return state;
      return {
        index: exactIndex,
        generation: sourceChanged ? state.generation + 1 : state.generation,
      };
    }
  }

  const fallbackIndex = Math.min(Math.max(state.index, 0), nextPhotos.length - 1);
  return advanceHeroPhotoRenderState(fallbackIndex, state.generation);
};

export interface HeroState {
  /** Monotonic identity for one forward or reverse motion run. */
  runId: number;
  /** dog id the transition belongs to; ties source and destination together. */
  id: string | null;
  source: HeroSource | null;
  sourceKind: HeroSourceKind | null;
  /**
   * Keeps the covered source surface hidden after a safe forward handoff.
   * Native transparentModal snapshots can otherwise retain that surface and
   * reveal a second copy underneath the reverse overlay.
   */
  settledSourceOwner: HeroSourceOwner | null;
  photoSessionToken: HeroPhotoSessionToken | null;
  sourceImageKey: string | null;
  sourcePhotoGeneration: number | null;
  /** Card chrome that is genuinely shared by both ends of the transition. */
  chrome: HeroChrome | null;
  /** Swipe-card photo treatment (top luminance gradient), independent of chrome measurement. */
  cardSurface: boolean;
  topSurfaceFromOpacity: number;
  topSurfaceToOpacity: number;
  /** Source-card bottom scrim, expressed as stops within the full photo surface. */
  bottomSurfaceLocations: HeroBottomSurfaceLocations | null;
  /** Name + age share typography but move outside the photo on DogProfile. */
  title: HeroTitle | null;
  titleFrom: HeroFrame | null;
  titleTo: HeroFrame | null;
  /** Source-only card bio stays above the flying photo while it fades away. */
  sourceBio: HeroBio | null;
  sourceBioFrame: HeroFrame | null;
  /** Target-only glass Back control stays above the flying photo while it fades in. */
  goBackFrame: HeroFrame | null;
  phase: "forward" | "reverse" | null;
  /** measured swipe-card photo frame (start of the morph). */
  from: HeroFrame | null;
  /** measured DogProfile photo frame (end of the morph). set once it mounts. */
  to: HeroFrame | null;
  /** measured content frame that owns distance + photo pagination. */
  chromeFrom: HeroFrame | null;
  chromeTo: HeroFrame | null;
  actionFrom: HeroFrame | null;
  actionTo: HeroFrame | null;
  /** Native card shadow owned by the flying photo for this run. */
  shadowFrom: HeroShadow;
  shadowTo: HeroShadow;
  /**
   * True once the flying overlay image has actually painted (expo-image
   * `onDisplay`). The real photos underneath only hide from this point on --
   * hiding them on `startHero` left a 1-2 frame blank flash while the overlay
   * image decoded.
   */
  overlayReady: boolean;
  /** The exact forward destination reached native `viewDidAppear`. */
  destinationPresented: boolean;
  /** Reverse landed and removed its destination route; source owns handoff. */
  handoffPending: boolean;
  /** Failure-only forward handoff: reveal only the measured destination under FWO. */
  forwardFallback: "target" | null;
  /** Explicit recovery surface chosen before q begins. */
  forwardRecoveryKind: "measured" | "frozen-frame" | "placeholder" | null;
  /** Recovery-only landed Back frame; never retargets the frozen overlay clone. */
  forwardGoBackCorrection: HeroFrame | null;
  /** Recovery-only landed photo frame; never retargets the frozen overlay clone. */
  forwardPhotoCorrection: HeroFrame | null;
  /** Frozen when q starts so a late Back measurement cannot flip visual ownership. */
  forwardGoBackRecoveryMode: "covered" | "complement" | null;
  /** Failure-only visual recovery; ordinary hero runs never allocate a second clock. */
  reverseFallback: "scene" | "handoff" | null;
  /** bumped every mutation so subscribers re-read. */
  version: number;
}

const initialState: HeroState = {
  runId: 0,
  id: null,
  source: null,
  sourceKind: null,
  settledSourceOwner: null,
  photoSessionToken: null,
  sourceImageKey: null,
  sourcePhotoGeneration: null,
  chrome: null,
  cardSurface: false,
  topSurfaceFromOpacity: 0,
  topSurfaceToOpacity: 0,
  bottomSurfaceLocations: null,
  title: null,
  titleFrom: null,
  titleTo: null,
  sourceBio: null,
  sourceBioFrame: null,
  goBackFrame: null,
  phase: null,
  from: null,
  to: null,
  chromeFrom: null,
  chromeTo: null,
  actionFrom: null,
  actionTo: null,
  shadowFrom: NO_HERO_SHADOW,
  shadowTo: NO_HERO_SHADOW,
  overlayReady: false,
  destinationPresented: false,
  handoffPending: false,
  forwardFallback: null,
  forwardRecoveryKind: null,
  forwardGoBackCorrection: null,
  forwardPhotoCorrection: null,
  forwardGoBackRecoveryMode: null,
  reverseFallback: null,
  version: 0,
};

let state: HeroState = initialState;
let nextHeroRunId = 0;
let settledHero: HeroState | null = null;
const sourceActionFrames = new Map<string, HeroFrame>();

export type HeroForwardCancelReason =
  | "superseded"
  | "readiness-timeout"
  | "abandoned"
  | "reverse-in-flight";

interface ForwardRuntime {
  id: string;
  runId: number;
  navigationDispatched: boolean;
  stage:
    | "awaiting-paint"
    | "awaiting-commit"
    | "awaiting-motion"
    | "motion"
    | "target-handoff"
    | "target-probe"
    | "target-recovery";
  timer: ReturnType<typeof setTimeout>;
  cancelNotified: boolean;
  motionLanded: boolean;
  targetPhotoPainted: boolean;
  /** Frozen target participation for the initial destination measurement. */
  initialTargetRoles: ReadonlySet<HeroTargetRole>;
  /** Latest native frame per role until the complete destination can publish atomically. */
  pendingTargetFrames: Map<HeroTargetRole, HeroFrame>;
  targetFramesPublished: boolean;
  requiredTargetRoles: Set<HeroTargetRole>;
  acknowledgedTargetRoles: Set<HeroTargetRole>;
  correctedTargetFrames: Map<HeroTargetRole, HeroFrame>;
  recoveryRequested: boolean;
  forceUnsafeSnapshot: boolean;
  unsafeHandoffNotified: boolean;
  onReady: () => void;
  onPaintFailure: () => void;
  onUnsafeHandoff?: () => void;
  onCancel?: (reason: HeroForwardCancelReason) => void;
}

let forwardRuntime: ForwardRuntime | null = null;

export type HeroSourceRole = "photo" | "chrome" | "action" | "title" | "bio";
export type HeroTargetRole = "photo" | "chrome" | "action" | "title" | "goBack";
export type HeroReverseResult =
  | "started"
  | "in-flight"
  | "forward-in-flight"
  | "completion-pending"
  | "unavailable";

interface HeroReverseCallbacks {
  removeRoute: () => void;
  postHandoff?: () => void;
  /** Runs once after every start guard passes and immediately before publication. */
  onWillStart?: () => void;
}

interface ReverseRuntime {
  id: string;
  runId: number;
  callbacks: HeroReverseCallbacks;
  requiredRoles: ReadonlySet<HeroSourceRole>;
  acknowledgedRoles: Set<HeroSourceRole>;
  animationLanded: boolean;
  routeRemovalDispatched: boolean;
  sourceFocused: boolean;
  sourcePhotoPaintRequired: boolean;
  sourcePhotoPainted: boolean;
  expectedPhotoUri?: string;
  expectedPhotoImageKey: string | null;
  expectedPhotoGeneration: number | null;
  sourceInstanceToken: HeroPhotoSourceInstanceToken | null;
  photoSessionToken: HeroPhotoSessionToken | null;
  paintTimer: ReturnType<typeof setTimeout>;
  handoffTimer: ReturnType<typeof setTimeout> | null;
  stage: "awaiting-paint" | "motion" | "handoff" | "scene-fallback" | "handoff-recovery";
}

let reverseRuntime: ReverseRuntime | null = null;
type OverlayClearPending = {
  id: string;
  runId: number;
  photoSessionToken: HeroPhotoSessionToken | null;
  postHandoff?: () => void;
};

let overlayClearPending: OverlayClearPending | null = null;
let overlayClearConfirmationTimer: ReturnType<typeof setTimeout> | null = null;
const OVERLAY_CLEAR_CONFIRM_WATCHDOG_MS = 700;

const discardOverlayClearPending = () => {
  if (overlayClearConfirmationTimer) clearTimeout(overlayClearConfirmationTimer);
  overlayClearConfirmationTimer = null;
  overlayClearPending = null;
};

const takeOverlayClearPending = (runId?: number): OverlayClearPending | null => {
  const pending = overlayClearPending;
  if (!pending || (runId !== undefined && pending.runId !== runId)) return null;
  discardOverlayClearPending();
  // Pending overlay removal is real deck/surface ownership. Publish its
  // release before a deferred action can reentrantly acquire another owner.
  setState({});
  return pending;
};

const finishOverlayClearPending = (pending: OverlayClearPending) => {
  if (state.settledSourceOwner?.id === pending.id) {
    setState({ settledSourceOwner: null });
  }
  endHeroPhotoSession(pending.photoSessionToken);
  pending.postHandoff?.();
};

const scheduleOverlayClearConfirmation = (pending: OverlayClearPending) => {
  discardOverlayClearPending();
  overlayClearPending = pending;
  overlayClearConfirmationTimer = setTimeout(
    () => confirmHeroOverlayCleared(pending.runId),
    OVERLAY_CLEAR_CONFIRM_WATCHDOG_MS,
  );
};

const listeners = new Set<() => void>();
interface HeroPhotoSession extends HeroPhotoSelection {
  applySourceSelection: (
    index: number,
    imageKey: string,
  ) => { index: number; generation: number } | null;
}

const photoSessions = new Map<HeroPhotoSessionToken, HeroPhotoSession>();
const paintedSourcePhotos = new Map<
  HeroPhotoSourceInstanceToken,
  { imageKey: string; uri?: string; generation: number }
>();
const openingHeroSources = new Set<string>();
const openingHeroSourceCancellations = new Map<string, () => void>();
let nextPhotoSessionToken = 0;
let nextPhotoSourceInstanceToken = 0;

// Native measurements of the same layout can vary by a fraction of a point
// between effect/onLayout callbacks. Treat those as the same frame so a new
// object identity cannot restart an in-flight morph.
const FRAME_EPSILON = 0.5;

export const areHeroFramesEquivalent = (
  first: HeroFrame | null,
  second: HeroFrame | null,
): boolean => {
  if (!first || !second) return first === second;
  return (
    Math.abs(first.x - second.x) <= FRAME_EPSILON &&
    Math.abs(first.y - second.y) <= FRAME_EPSILON &&
    Math.abs(first.x + first.width - (second.x + second.width)) <= FRAME_EPSILON &&
    Math.abs(first.y + first.height - (second.y + second.height)) <= FRAME_EPSILON &&
    Math.abs((first.borderRadius ?? 0) - (second.borderRadius ?? 0)) <= FRAME_EPSILON
  );
};

/** Opaque target-scene cover for the part of Back that extends below the photo. */
export const getForwardGoBackOcclusionFrame = (
  photoFrame: HeroFrame,
  goBackFrame: HeroFrame,
  correctedGoBackFrame: HeroFrame | null = null,
): HeroFrame | null => {
  const photoBottom = photoFrame.y + photoFrame.height;
  const exposedFrames = [goBackFrame, correctedGoBackFrame]
    .filter((frame): frame is HeroFrame => Boolean(frame))
    .map((frame) => ({
      left: frame.x,
      right: frame.x + frame.width,
      top: Math.max(frame.y, photoBottom),
      bottom: frame.y + frame.height,
    }))
    .filter((frame) => frame.right > frame.left && frame.bottom > frame.top);
  if (exposedFrames.length === 0) return null;
  const left = Math.min(...exposedFrames.map((frame) => frame.left));
  const right = Math.max(...exposedFrames.map((frame) => frame.right));
  const top = Math.min(...exposedFrames.map((frame) => frame.top));
  const bottom = Math.max(...exposedFrames.map((frame) => frame.bottom));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

/** Corrected target pixels not covered by the frozen landed photo overlay. */
export const getForwardPhotoExposureFrames = (
  frozenFrame: HeroFrame,
  correctedFrame: HeroFrame,
): HeroFrame[] => {
  if (correctedFrame.width <= 0 || correctedFrame.height <= 0) return [];
  const correctedLeft = correctedFrame.x;
  const correctedTop = correctedFrame.y;
  const correctedRight = correctedFrame.x + correctedFrame.width;
  const correctedBottom = correctedFrame.y + correctedFrame.height;
  const intersectionLeft = Math.max(correctedLeft, frozenFrame.x);
  const intersectionTop = Math.max(correctedTop, frozenFrame.y);
  const intersectionRight = Math.min(correctedRight, frozenFrame.x + frozenFrame.width);
  const intersectionBottom = Math.min(correctedBottom, frozenFrame.y + frozenFrame.height);

  if (intersectionRight <= intersectionLeft || intersectionBottom <= intersectionTop) {
    return [
      {
        x: correctedFrame.x,
        y: correctedFrame.y,
        width: correctedFrame.width,
        height: correctedFrame.height,
      },
    ];
  }

  return [
    {
      x: correctedLeft,
      y: correctedTop,
      width: correctedFrame.width,
      height: intersectionTop - correctedTop,
    },
    {
      x: correctedLeft,
      y: intersectionBottom,
      width: correctedFrame.width,
      height: correctedBottom - intersectionBottom,
    },
    {
      x: correctedLeft,
      y: intersectionTop,
      width: intersectionLeft - correctedLeft,
      height: intersectionBottom - intersectionTop,
    },
    {
      x: intersectionRight,
      y: intersectionTop,
      width: correctedRight - intersectionRight,
      height: intersectionBottom - intersectionTop,
    },
  ].filter((frame) => frame.width > 0 && frame.height > 0);
};

/** One deadline shared by photo and action retargets for a transition run. */
export const createHeroMotionClock = (duration: number) => {
  let activeRunId = 0;
  let deadline = 0;

  return {
    remaining: (runId: number, now: number) => {
      if (activeRunId !== runId) {
        activeRunId = runId;
        deadline = now + duration;
      }
      return Math.max(0, deadline - now);
    },
    deadline: () => deadline,
  };
};

/**
 * One source interaction can own at most one measurement/navigation flight.
 * A successful push remains locked until that source has blurred and focused
 * again; measurement or navigation failures can release it immediately.
 */
export const createHeroForwardFlight = () => {
  let status: "idle" | "measuring" | "navigated" = "idle";
  let sourceBlurredAfterNavigation = false;

  return {
    begin: () => {
      if (status !== "idle") return false;
      status = "measuring";
      sourceBlurredAfterNavigation = false;
      return true;
    },
    markNavigated: () => {
      if (status === "measuring") status = "navigated";
    },
    fail: () => {
      status = "idle";
      sourceBlurredAfterNavigation = false;
    },
    onSourceFocusChange: (focused: boolean) => {
      if (status !== "navigated") return;
      if (!focused) {
        sourceBlurredAfterNavigation = true;
        return;
      }
      if (sourceBlurredAfterNavigation) {
        status = "idle";
        sourceBlurredAfterNavigation = false;
      }
    },
    status: () => status,
  };
};

const emit = () => {
  for (const listener of listeners) listener();
};

const setState = (next: Partial<HeroState>) => {
  state = { ...state, ...next, version: state.version + 1 };
  emit();
};

const releaseSettledSourceOwner = (id?: string) => {
  if (!state.settledSourceOwner || (id && state.settledSourceOwner.id !== id)) return;
  setState({ settledSourceOwner: null });
};

export const createHeroPhotoSourceInstanceToken = (): HeroPhotoSourceInstanceToken =>
  `hero-photo-source-${++nextPhotoSourceInstanceToken}`;

export const beginHeroPhotoSession = (args: {
  id: string;
  sourceInstanceToken: HeroPhotoSourceInstanceToken;
  index: number;
  imageKey: string;
  generation: number;
  source: HeroSource;
  applySourceSelection: (
    index: number,
    imageKey: string,
  ) => { index: number; generation: number } | null;
}): HeroPhotoSessionToken => {
  const sessionToken = `hero-photo-session-${++nextPhotoSessionToken}`;
  photoSessions.set(sessionToken, { ...args, sessionToken });
  return sessionToken;
};

export const endHeroPhotoSession = (sessionToken: HeroPhotoSessionToken | null | undefined) => {
  if (sessionToken) photoSessions.delete(sessionToken);
};

export const invalidateHeroPhotoSession = (args: {
  id: string;
  sessionToken: HeroPhotoSessionToken;
}) => {
  const session = photoSessions.get(args.sessionToken);
  if (!session || session.id !== args.id) return;
  photoSessions.delete(args.sessionToken);
  if (settledHero?.id === args.id && settledHero.photoSessionToken === args.sessionToken) {
    settledHero = null;
    releaseSettledSourceOwner(args.id);
  }
  if (
    state.id === args.id &&
    state.phase === "forward" &&
    state.photoSessionToken === args.sessionToken
  ) {
    abandonHero(args.id, state.runId);
  }
};

export const releaseHeroPhotoSourceInstance = (
  sourceInstanceToken: HeroPhotoSourceInstanceToken,
) => {
  paintedSourcePhotos.delete(sourceInstanceToken);
  for (const [sessionToken, session] of photoSessions) {
    if (session.sourceInstanceToken !== sourceInstanceToken) continue;
    photoSessions.delete(sessionToken);
    if (settledHero?.photoSessionToken === sessionToken) {
      const settledId = settledHero.id ?? session.id;
      settledHero = null;
      releaseSettledSourceOwner(settledId);
    }
  }
};

export const getHeroPhotoSelectionSnapshot = (
  sessionToken: HeroPhotoSessionToken,
): HeroPhotoSelection | null => {
  const session = photoSessions.get(sessionToken);
  if (!session) return null;
  const { applySourceSelection: _applySourceSelection, ...selection } = session;
  return selection;
};

const clearHeroSourceOpeningOwner = (id: string, cancel: boolean): boolean => {
  const owned = openingHeroSources.delete(id);
  const cancellation = openingHeroSourceCancellations.get(id);
  openingHeroSourceCancellations.delete(id);
  if (cancel && cancellation) cancellation();
  return owned || Boolean(cancellation);
};

/** Exactly one source may own the measure/paint navigation boundary globally. */
export const setHeroSourceOpening = (id: string, opening: boolean, onCancel?: () => void) => {
  let changed = false;
  if (!opening) {
    changed = clearHeroSourceOpeningOwner(id, false);
  } else {
    for (const openingId of openingHeroSources) {
      if (openingId === id && openingHeroSourceCancellations.get(openingId) === onCancel) continue;
      changed = clearHeroSourceOpeningOwner(openingId, true) || changed;
    }
    if (!openingHeroSources.has(id)) {
      openingHeroSources.add(id);
      changed = true;
    }
    if (onCancel) openingHeroSourceCancellations.set(id, onCancel);
    else openingHeroSourceCancellations.delete(id);
  }
  if (changed) setState({});
};

export const isHeroSourceOpening = (id: string | undefined): boolean =>
  Boolean(id && openingHeroSources.has(id));

export const cancelHeroSourceOpening = (id: string) => {
  if (clearHeroSourceOpeningOwner(id, true)) setState({});
};

/** Global Swipe interaction gate: opening measurement and either hero direction own the deck. */
export const isSwipeSurfaceHeroLocked = (): boolean =>
  openingHeroSources.size > 0 ||
  (state.sourceKind === "swipe" && state.phase !== null) ||
  overlayClearPending !== null;

/**
 * Redux deck mutations must also respect a settled Swipe hero: the covered
 * source card is the exact geometry a later reverse handoff must reveal.
 * Keep this separate from the UI surface lock so DogProfile actions remain usable.
 */
export const isSwipeDeckMutationHeroLocked = (): boolean =>
  openingHeroSources.size > 0 ||
  (state.sourceKind === "swipe" && state.phase !== null) ||
  settledHero?.sourceKind === "swipe" ||
  overlayClearPending !== null;

export const useIsSwipeDeckMutationHeroLocked = (): boolean => {
  useHeroState();
  return isSwipeDeckMutationHeroLocked();
};

/**
 * Wait for deck geometry ownership to clear without polling. The deadline only
 * bounds one subscription; callers revalidate their exact Redux dog before
 * deciding whether to wait again.
 */
export const waitForSwipeDeckMutationHeroIdle = (timeoutMs: number): Promise<boolean> => {
  if (!isSwipeDeckMutationHeroLocked()) return Promise.resolve(true);

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let onOwnershipChange!: () => void;
  const idle = new Promise<boolean>((resolve) => {
    onOwnershipChange = () => {
      if (isSwipeDeckMutationHeroLocked()) return;
      listeners.delete(onOwnershipChange);
      resolve(true);
    };
    listeners.add(onOwnershipChange);
    onOwnershipChange();
  });
  const deadline = new Promise<boolean>((resolve) => {
    timeout = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
  });

  return Promise.race([idle, deadline]).finally(() => {
    if (timeout) clearTimeout(timeout);
    listeners.delete(onOwnershipChange);
  });
};

export const useIsSwipeSurfaceHeroLocked = (): boolean => {
  useHeroState();
  return isSwipeSurfaceHeroLocked();
};

/** Deck promotion invalidates an opening/forward owner that is no longer the current card. */
export const cancelNonCurrentSwipeHeroOwner = (currentId: string | null | undefined) => {
  for (const openingId of openingHeroSources) {
    if (openingId !== currentId) cancelHeroSourceOpening(openingId);
  }
  if (
    state.sourceKind === "swipe" &&
    state.phase === "forward" &&
    state.id !== currentId &&
    state.id !== null
  ) {
    abandonHero(state.id, state.runId, "superseded");
  }
};

const FORWARD_WATCHDOG_MS = 700;

export interface HeroForwardTimerScheduler {
  clear: (timer: ReturnType<typeof setTimeout>) => void;
  set: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
}

const nativeForwardTimerScheduler: HeroForwardTimerScheduler = {
  clear: (timer) => clearTimeout(timer),
  set: (callback, delayMs) => setTimeout(callback, delayMs),
};
let forwardTimerScheduler = nativeForwardTimerScheduler;

/** Test-only clock injection for deterministic forward watchdog coverage. */
export const setHeroForwardTimerSchedulerForVerification = (
  scheduler?: HeroForwardTimerScheduler,
) => {
  forwardTimerScheduler = scheduler ?? nativeForwardTimerScheduler;
};

const clearForwardRuntime = (
  runId: number,
  reason: HeroForwardCancelReason,
  notifyCancel: boolean,
): ForwardRuntime | null => {
  const runtime = forwardRuntime;
  if (!runtime || runtime.runId !== runId) return null;
  forwardRuntime = null;
  forwardTimerScheduler.clear(runtime.timer);
  if (notifyCancel && !runtime.cancelNotified) {
    runtime.cancelNotified = true;
    runtime.onCancel?.(reason);
  }
  return runtime;
};

const armForwardWatchdog = (runtime: ForwardRuntime, stage: ForwardRuntime["stage"]) => {
  forwardTimerScheduler.clear(runtime.timer);
  runtime.stage = stage;
  runtime.timer = forwardTimerScheduler.set(
    () => handleForwardWatchdog(runtime.runId),
    FORWARD_WATCHDOG_MS,
  );
};

const expectedTargetFrameForRole = (role: HeroTargetRole): HeroFrame | null => {
  switch (role) {
    case "photo":
      return state.to;
    case "chrome":
      return state.chromeTo;
    case "action":
      return state.actionTo;
    case "title":
      return state.titleTo;
    case "goBack":
      return state.goBackFrame;
  }
};

const getInitialTargetRoles = (hero: HeroState): Set<HeroTargetRole> => {
  const roles = new Set<HeroTargetRole>(["photo", "goBack"]);
  // Chat deliberately has target-only distance/pagination. Swipe owns both
  // chrome endpoints, and action/title participate only when their measured
  // source counterparts were frozen into this exact run.
  if (hero.chrome) roles.add("chrome");
  if (hero.actionFrom) roles.add("action");
  if (hero.title && hero.titleFrom) roles.add("title");
  return roles;
};

const targetFramePatch = (role: HeroTargetRole, frame: HeroFrame): Partial<HeroState> => {
  switch (role) {
    case "photo":
      return { to: frame };
    case "chrome":
      return { chromeTo: frame };
    case "action":
      return { actionTo: frame };
    case "title":
      return { titleTo: frame };
    case "goBack":
      return { goBackFrame: frame };
  }
};

const createSafeForwardSnapshot = (runtime: ForwardRuntime): HeroState | null => {
  if (
    state.id !== runtime.id ||
    state.runId !== runtime.runId ||
    state.phase !== "forward" ||
    runtime.forceUnsafeSnapshot ||
    !runtime.targetPhotoPainted
  ) {
    return null;
  }
  for (const role of runtime.requiredTargetRoles) {
    if (!runtime.correctedTargetFrames.has(role)) return null;
  }

  return {
    ...state,
    to: runtime.correctedTargetFrames.get("photo") ?? state.to,
    chromeTo: runtime.requiredTargetRoles.has("chrome")
      ? (runtime.correctedTargetFrames.get("chrome") ?? null)
      : state.chromeTo,
    actionTo: runtime.requiredTargetRoles.has("action")
      ? (runtime.correctedTargetFrames.get("action") ?? null)
      : state.actionTo,
    titleTo: runtime.requiredTargetRoles.has("title")
      ? (runtime.correctedTargetFrames.get("title") ?? null)
      : state.titleTo,
    goBackFrame: runtime.correctedTargetFrames.get("goBack") ?? state.goBackFrame,
    overlayReady: false,
    handoffPending: false,
    forwardFallback: null,
    forwardRecoveryKind: null,
    forwardGoBackCorrection: null,
    forwardPhotoCorrection: null,
    forwardGoBackRecoveryMode: null,
  };
};

const finishForwardRuntime = (runId: number) => {
  const runtime = forwardRuntime;
  if (!runtime || runtime.runId !== runId) return;
  const safeSnapshot = createSafeForwardSnapshot(runtime);
  settledHero = safeSnapshot;
  clearForwardRuntime(runId, "abandoned", false);
  // Forward completion is a terminal boundary for the source-opening lock.
  // MainCard normally releases it immediately before navigation, but native
  // focus/commit ordering can skip that JS cleanup while the hero itself still
  // lands successfully. Never leave the settled profile's actions disabled
  // because an already-completed measurement owner leaked across the push.
  clearHeroSourceOpeningOwner(runtime.id, false);
  state = {
    ...initialState,
    settledSourceOwner:
      safeSnapshot?.id && safeSnapshot.sourceKind
        ? { id: safeSnapshot.id, sourceKind: safeSnapshot.sourceKind }
        : null,
    version: state.version + 1,
  };
  emit();
  if (!safeSnapshot && !runtime.unsafeHandoffNotified) {
    runtime.unsafeHandoffNotified = true;
    // Runtime and visible ownership are already detached, so a throwing or
    // reentrant route update cannot strand or overwrite this completed run.
    try {
      runtime.onUnsafeHandoff?.();
    } catch {
      // The route can still pop with ordinary navigation; Hero is already idle.
    }
  }
};

const finishForwardTargetHandoffIfReady = () => {
  const runtime = forwardRuntime;
  if (
    !runtime ||
    (runtime.stage !== "target-handoff" && runtime.stage !== "target-probe") ||
    !runtime.motionLanded ||
    !runtime.targetPhotoPainted
  ) {
    return;
  }
  for (const role of runtime.requiredTargetRoles) {
    if (!runtime.acknowledgedTargetRoles.has(role)) return;
  }
  finishForwardRuntime(runtime.runId);
};

const hasForwardRecoverySurface = (runtime: ForwardRuntime) =>
  runtime.targetPhotoPainted && runtime.correctedTargetFrames.has("photo");

const startForwardTargetRecovery = (
  runtime: ForwardRuntime,
  kind: NonNullable<HeroState["forwardRecoveryKind"]>,
) => {
  if (runtime.stage !== "target-handoff" && runtime.stage !== "target-probe") return;
  if (kind !== "measured") runtime.forceUnsafeSnapshot = true;
  armForwardWatchdog(runtime, "target-recovery");
  setState({
    forwardFallback: "target",
    forwardRecoveryKind: kind,
    forwardGoBackRecoveryMode: runtime.correctedTargetFrames.has("goBack")
      ? "covered"
      : "complement",
  });
};

const beginForwardTargetRecovery = (runId: number) => {
  const runtime = forwardRuntime;
  if (
    !runtime ||
    runtime.runId !== runId ||
    (runtime.stage !== "target-handoff" && runtime.stage !== "target-probe")
  ) {
    return;
  }
  runtime.recoveryRequested = true;
  if (hasForwardRecoverySurface(runtime)) {
    startForwardTargetRecovery(runtime, "measured");
    return;
  }
  // One bounded probe window lets a native paint/frame callback arrive late.
  // Repeated callbacks cannot extend it because target-probe never rearms.
  if (runtime.stage === "target-handoff") armForwardWatchdog(runtime, "target-probe");
};

const resolveForwardTargetHandoff = (runId: number) => {
  finishForwardTargetHandoffIfReady();
  const runtime = forwardRuntime;
  if (
    runtime?.runId === runId &&
    (runtime.stage === "target-handoff" || runtime.stage === "target-probe") &&
    runtime.recoveryRequested &&
    hasForwardRecoverySurface(runtime)
  ) {
    startForwardTargetRecovery(runtime, "measured");
  }
};

const beginForwardTerminalRecovery = (runId: number) => {
  const runtime = forwardRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "target-probe") return;
  if (hasForwardRecoverySurface(runtime)) {
    startForwardTargetRecovery(runtime, "measured");
    return;
  }

  // The ordinary reversible contract remains strict. Terminal degradation
  // only chooses a visual q surface and always disables the reverse snapshot.
  runtime.forceUnsafeSnapshot = true;
  if (!runtime.correctedTargetFrames.has("photo") && state.to) {
    runtime.correctedTargetFrames.set("photo", state.to);
  }
  startForwardTargetRecovery(runtime, runtime.targetPhotoPainted ? "frozen-frame" : "placeholder");
};

export const completeForwardTargetRecovery = (runId: number) => {
  const runtime = forwardRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "target-recovery") return;
  finishForwardRuntime(runId);
};

const handleForwardWatchdog = (runId: number) => {
  const runtime = forwardRuntime;
  if (!runtime || runtime.runId !== runId) return;

  switch (runtime.stage) {
    case "awaiting-paint": {
      runtime.navigationDispatched = true;
      const fallback = runtime.onPaintFailure;
      clearForwardRuntime(runId, "abandoned", false);
      abandonHero(runtime.id, runId);
      fallback();
      return;
    }
    case "awaiting-commit": {
      // Never hero-push from a timer: the source opacity-zero native commit
      // is what makes transparentModal snapshot a clean scene. Fall back to
      // ordinary navigation if the post-commit effect never dispatches.
      runtime.navigationDispatched = true;
      const fallback = runtime.onPaintFailure;
      clearForwardRuntime(runId, "abandoned", false);
      abandonHero(runtime.id, runId);
      fallback();
      return;
    }
    case "awaiting-motion":
      abandonHero(runtime.id, runId, "readiness-timeout");
      return;
    case "motion":
      // The UI-thread completion callback may be lost after p visually lands.
      // Enter the same exact target handoff as the ordinary completion path.
      endHero(runId);
      return;
    case "target-handoff":
      beginForwardTargetRecovery(runId);
      return;
    case "target-probe":
      beginForwardTerminalRecovery(runId);
      return;
    case "target-recovery":
      completeForwardTargetRecovery(runId);
  }
};

/**
 * Begin a hero transition. Called from the swipe card the moment the user taps
 * to open a profile, with the tapped photo's measured frame and source. The
 * destination frames arrive later via {@link registerHeroTargetFrame}.
 */
export const startHero = (args: {
  id: string;
  source: HeroSource;
  sourceKind: HeroSourceKind;
  sourceImageKey: string;
  sourcePhotoGeneration?: number;
  photoSessionToken?: HeroPhotoSessionToken;
  from: HeroFrame;
  chrome?: HeroChrome;
  chromeFrom?: HeroFrame;
  cardSurface?: boolean;
  topSurfaceFromOpacity?: number;
  topSurfaceToOpacity?: number;
  bottomSurfaceLocations?: HeroBottomSurfaceLocations;
  title?: HeroTitle;
  titleFrom?: HeroFrame;
  sourceBio?: HeroBio;
  sourceBioFrame?: HeroFrame;
  shadow?: HeroShadow;
  onReady?: () => void;
  onPaintFailure?: () => void;
  onUnsafeHandoff?: () => void;
  onCancel?: (reason: HeroForwardCancelReason) => void;
}): number => {
  // A native/manual reverse already owns the route removal. A second source
  // cannot replace its overlay or callbacks; release that new source instead.
  if (reverseRuntime && state.phase === "reverse") {
    args.onCancel?.("reverse-in-flight");
    return state.runId;
  }

  // A completed reverse still owns its deferred action until React confirms
  // that the overlay-removal commit happened (or its confirmation watchdog
  // fires). Consume that completion before notifying this rejected opening.
  // Detaching it first makes a postHandoff that starts another run reentrant:
  // this outer attempt returns without overwriting the run created inside it.
  const pendingReverseCompletion = takeOverlayClearPending();
  if (pendingReverseCompletion) {
    try {
      args.onCancel?.("superseded");
    } finally {
      finishOverlayClearPending(pendingReverseCompletion);
    }
    return state.runId;
  }

  // A new navigation attempt supersedes every previously completed hero,
  // including one for the same dog. Until this forward transition itself
  // lands, there must be nothing reversible: an immediate Back or a timeout
  // cannot resurrect geometry from an older Swipe/Profile visit.
  endHeroPhotoSession(settledHero?.photoSessionToken);
  settledHero = null;
  const supersededForwardId = state.phase === "forward" ? state.id : null;
  const supersededForwardRunId = state.phase === "forward" ? state.runId : null;
  const supersededPhotoSession = state.phase === "forward" ? state.photoSessionToken : null;
  if (supersededForwardRunId !== null) {
    state = { ...initialState, version: state.version + 1 };
    clearForwardRuntime(supersededForwardRunId, "superseded", true);
    endHeroPhotoSession(supersededPhotoSession);
    if (supersededForwardId && supersededForwardId !== args.id) {
      clearHeroSourceOpeningOwner(supersededForwardId, false);
    }
  } else if (forwardRuntime) {
    clearForwardRuntime(forwardRuntime.runId, "superseded", true);
  }
  const runId = ++nextHeroRunId;
  setState({
    runId,
    id: args.id,
    source: args.source,
    sourceKind: args.sourceKind,
    settledSourceOwner: null,
    photoSessionToken: args.photoSessionToken ?? null,
    sourceImageKey: args.sourceImageKey,
    sourcePhotoGeneration: args.sourcePhotoGeneration ?? null,
    chrome: args.chrome ?? null,
    cardSurface: args.cardSurface ?? false,
    topSurfaceFromOpacity: args.topSurfaceFromOpacity ?? (args.cardSurface === true ? 1 : 0),
    topSurfaceToOpacity: args.topSurfaceToOpacity ?? (args.cardSurface === true ? 1 : 0),
    bottomSurfaceLocations: args.bottomSurfaceLocations ?? null,
    title: args.title ?? null,
    titleFrom: args.title ? (args.titleFrom ?? null) : null,
    titleTo: null,
    sourceBio: args.sourceBio ?? null,
    sourceBioFrame: args.sourceBio ? (args.sourceBioFrame ?? null) : null,
    goBackFrame: null,
    phase: "forward",
    from: args.from,
    to: null,
    chromeFrom: args.chrome ? (args.chromeFrom ?? null) : null,
    chromeTo: null,
    // Only Swipe heroes carry card chrome/action controls. A Chat avatar can
    // share a dog id with an earlier Swipe card, but must never inherit that
    // process-lifetime action frame and wait for a target it does not render.
    actionFrom:
      args.sourceKind === "swipe" && args.chrome ? (sourceActionFrames.get(args.id) ?? null) : null,
    actionTo: null,
    shadowFrom: args.shadow ?? NO_HERO_SHADOW,
    shadowTo: NO_HERO_SHADOW,
    overlayReady: false,
    destinationPresented: false,
    handoffPending: false,
    forwardFallback: null,
    forwardRecoveryKind: null,
    forwardGoBackCorrection: null,
    forwardPhotoCorrection: null,
    forwardGoBackRecoveryMode: null,
    reverseFallback: null,
  });
  if (args.onReady && args.onPaintFailure) {
    forwardRuntime = {
      id: args.id,
      runId,
      navigationDispatched: false,
      stage: "awaiting-paint",
      timer: forwardTimerScheduler.set(() => handleForwardWatchdog(runId), FORWARD_WATCHDOG_MS),
      cancelNotified: false,
      motionLanded: false,
      targetPhotoPainted: false,
      initialTargetRoles: getInitialTargetRoles(state),
      pendingTargetFrames: new Map(),
      targetFramesPublished: false,
      requiredTargetRoles: new Set(),
      acknowledgedTargetRoles: new Set(),
      correctedTargetFrames: new Map(),
      recoveryRequested: false,
      forceUnsafeSnapshot: false,
      unsafeHandoffNotified: false,
      onReady: args.onReady,
      onPaintFailure: args.onPaintFailure,
      onUnsafeHandoff: args.onUnsafeHandoff,
      onCancel: args.onCancel,
    };
  }
  return runId;
};

const MEASURE_WATCHDOG_MS = 250;

/**
 * Navigation must not depend indefinitely on a native measurement callback:
 * refs can be null during teardown and native callbacks are not guaranteed to
 * arrive. The returned function wins exactly once. A valid measurement starts
 * a paint-gated hero; otherwise the watchdog takes the normal non-hero route.
 */
export interface HeroNavigationWatchdog {
  (prepareHero?: () => void): void;
  cancel: () => void;
}

export const createHeroNavigationWatchdog = (
  navigate: (heroTransition?: string) => void,
): HeroNavigationWatchdog => {
  let completed = false;

  const complete = (prepareHero?: () => void) => {
    if (completed) return;
    completed = true;
    clearTimeout(timer);
    if (prepareHero) {
      prepareHero();
      return;
    }
    navigate();
  };

  const timer = setTimeout(complete, MEASURE_WATCHDOG_MS);
  const watchdog = complete as HeroNavigationWatchdog;
  watchdog.cancel = () => {
    if (completed) return;
    completed = true;
    clearTimeout(timer);
  };
  return watchdog;
};

/** Called by the overlay image's `onDisplay` -- it has pixels on screen. */
export const markHeroOverlayReady = (runId: number) => {
  if (state.id === null || state.runId !== runId || state.overlayReady) return;
  const reverse = reverseRuntime;
  // A late image decode must not steal visual ownership back from the
  // already-running real-scene fallback.
  if (reverse?.runId === runId && reverse.stage === "scene-fallback") return;
  setState({ overlayReady: true });
  const runtime = forwardRuntime;
  if (!runtime || runtime.runId !== runId || runtime.navigationDispatched) return;
  armForwardWatchdog(runtime, "awaiting-commit");
};

/** Navigate only after React committed hidden source endpoints to native views. */
export const dispatchHeroForwardNavigation = (runId: number): boolean => {
  const runtime = forwardRuntime;
  if (
    !runtime ||
    runtime.runId !== runId ||
    runtime.navigationDispatched ||
    runtime.stage !== "awaiting-commit" ||
    state.runId !== runId ||
    state.phase !== "forward" ||
    !state.overlayReady
  ) {
    return false;
  }
  runtime.navigationDispatched = true;
  armForwardWatchdog(runtime, "awaiting-motion");
  try {
    runtime.onReady();
  } catch (error) {
    abandonHero(runtime.id, runId, "abandoned");
    throw error;
  }
  return true;
};

/**
 * A forward route can present after its React layout and measurements finish.
 * Accept only the native-stack `viewDidAppear` event owned by this exact run.
 */
export const markHeroDestinationPresented = (args: {
  id: string;
  runId: number;
  closing: boolean;
}): boolean => {
  const runtime = forwardRuntime;
  if (
    args.closing ||
    !runtime ||
    runtime.id !== args.id ||
    runtime.runId !== args.runId ||
    !runtime.navigationDispatched ||
    runtime.stage !== "awaiting-motion" ||
    state.id !== args.id ||
    state.runId !== args.runId ||
    state.phase !== "forward" ||
    state.destinationPresented
  ) {
    return false;
  }

  setState({ destinationPresented: true });
  return true;
};

/** Both directions keep ownership until shared motion has actually completed. */
export const markHeroMotionStarted = (runId: number) => {
  const forward = forwardRuntime;
  if (forward?.runId === runId) {
    if (forward.stage === "awaiting-motion") armForwardWatchdog(forward, "motion");
    return;
  }

  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "awaiting-paint") return;
  clearTimeout(runtime.paintTimer);
  runtime.stage = "motion";
  runtime.paintTimer = setTimeout(() => handleReverseWatchdog(runId), REVERSE_PAINT_WATCHDOG_MS);
};

/**
 * Collect the first native destination frames without exposing partial
 * geometry to subscribers. The last participating role publishes one atomic
 * state update; genuine corrections can still retarget before p lands.
 */
export const registerHeroTargetFrame = (args: {
  id: string;
  runId: number;
  role: HeroTargetRole;
  frame: HeroFrame;
}): boolean => {
  const runtime = forwardRuntime;
  if (
    !runtime ||
    runtime.id !== args.id ||
    runtime.runId !== args.runId ||
    state.id !== args.id ||
    state.runId !== args.runId ||
    state.phase !== "forward" ||
    runtime.motionLanded ||
    !runtime.initialTargetRoles.has(args.role)
  ) {
    return false;
  }

  if (runtime.targetFramesPublished) {
    const current = expectedTargetFrameForRole(args.role);
    if (areHeroFramesEquivalent(current, args.frame)) return true;
    setState(targetFramePatch(args.role, args.frame));
    return true;
  }

  const pending = runtime.pendingTargetFrames.get(args.role) ?? null;
  if (!areHeroFramesEquivalent(pending, args.frame)) {
    runtime.pendingTargetFrames.set(args.role, args.frame);
  }
  for (const role of runtime.initialTargetRoles) {
    if (!runtime.pendingTargetFrames.has(role)) return true;
  }

  const frames = runtime.pendingTargetFrames;
  runtime.targetFramesPublished = true;
  // Destination readiness gets one fresh presentation window. Partial frame
  // arrivals keep the initial deadline; later corrections cannot extend this one.
  if (runtime.stage === "awaiting-motion") {
    armForwardWatchdog(runtime, "awaiting-motion");
  }
  setState({
    to: frames.get("photo")!,
    goBackFrame: frames.get("goBack")!,
    ...(runtime.initialTargetRoles.has("chrome") && { chromeTo: frames.get("chrome")! }),
    ...(runtime.initialTargetRoles.has("action") && { actionTo: frames.get("action")! }),
    ...(runtime.initialTargetRoles.has("title") && { titleTo: frames.get("title")! }),
  });
  return true;
};

/**
 * The forward overlay may only release after the destination has displayed
 * the exact image generation it cloned. A stale onDisplay from an old React
 * key cannot satisfy this gate.
 */
export const markHeroTargetPhotoPainted = (args: {
  id: string;
  runId: number;
  imageKey: string;
  uri?: string;
  generation: number;
}): boolean => {
  const runtime = forwardRuntime;
  if (
    !runtime ||
    runtime.id !== args.id ||
    runtime.runId !== args.runId ||
    state.id !== args.id ||
    state.runId !== args.runId ||
    state.phase !== "forward" ||
    state.sourceImageKey !== args.imageKey ||
    state.source?.uri !== args.uri ||
    state.sourcePhotoGeneration !== args.generation
  ) {
    return false;
  }
  runtime.targetPhotoPainted = true;
  resolveForwardTargetHandoff(args.runId);
  return true;
};

/**
 * Publish a landed destination frame without retargeting the already-landed
 * overlay. A pre-landing measurement is diagnostic only; every role measures
 * again after the handoffPending commit.
 */
export const acknowledgeHeroTargetFrame = (args: {
  id: string;
  runId: number;
  role: HeroTargetRole;
  frame: HeroFrame;
}): boolean => {
  const runtime = forwardRuntime;
  if (
    !runtime ||
    runtime.id !== args.id ||
    runtime.runId !== args.runId ||
    state.id !== args.id ||
    state.runId !== args.runId ||
    state.phase !== "forward"
  ) {
    return false;
  }

  const expected = expectedTargetFrameForRole(args.role);
  if (!expected) return false;
  const equivalent = areHeroFramesEquivalent(expected, args.frame);

  if (!runtime.motionLanded) {
    // Layout can still shift as p lands, so this cannot transfer ownership.
    return equivalent;
  }
  if (!runtime.requiredTargetRoles.has(args.role)) return false;
  runtime.correctedTargetFrames.set(args.role, args.frame);
  if (args.role === "photo") {
    setState({ forwardPhotoCorrection: equivalent ? null : args.frame });
  }
  if (args.role === "goBack") {
    setState({ forwardGoBackCorrection: equivalent ? null : args.frame });
  }

  if (equivalent) {
    runtime.acknowledgedTargetRoles.add(args.role);
    resolveForwardTargetHandoff(args.runId);
  } else if (runtime.stage === "target-handoff" || runtime.stage === "target-probe") {
    beginForwardTargetRecovery(args.runId);
  }
  return equivalent;
};

/**
 * Keep Swipe's card and DogProfile on the same pixels after paging in the
 * profile. A run token prevents an old profile screen from rewriting a newer
 * card visit. Shared chrome is optional; Chat/avatar entries never create a
 * photo session and keep their explicit first-image semantics.
 */
export type HeroPhotoSelectionUpdateResult =
  | "synced"
  | "reordered"
  | "missing"
  | "stale"
  | "in-flight";

export const updateHeroPhotoSelection = (args: {
  id: string;
  sessionToken: HeroPhotoSessionToken;
  index: number;
  imageKey: string;
  source: HeroSource;
}): HeroPhotoSelectionUpdateResult => {
  const session = photoSessions.get(args.sessionToken);
  if (!session || session.id !== args.id) return "stale";
  if (
    state.phase === "reverse" &&
    reverseRuntime?.id === args.id &&
    reverseRuntime.photoSessionToken === args.sessionToken
  ) {
    // Back snapshots one exact photo generation. A press already queued on
    // the JS thread must not rewrite the hidden source after reverse owns it.
    return "in-flight";
  }

  // Reconcile the hidden Swipe source before the visible profile changes.
  // The opaque route-scoped session prevents a stale profile from touching a
  // newer source instance for the same dog.
  const sourceSelection = session.applySourceSelection(args.index, args.imageKey);
  if (sourceSelection === null) {
    invalidateHeroPhotoSession({ id: args.id, sessionToken: args.sessionToken });
    return "missing";
  }
  Object.assign(session, {
    index: sourceSelection.index,
    imageKey: args.imageKey,
    generation: sourceSelection.generation,
    source: args.source,
  });

  // The same pixels can still be synchronized across reordered arrays, but
  // pagination geometry no longer has one truthful shared index.
  if (sourceSelection.index !== args.index) {
    if (settledHero?.id === args.id && settledHero.photoSessionToken === args.sessionToken) {
      settledHero = null;
      releaseSettledSourceOwner(args.id);
    }
    return "reordered";
  }

  if (
    state.id === args.id &&
    state.phase === "forward" &&
    state.sourceKind === "swipe" &&
    state.photoSessionToken === args.sessionToken
  ) {
    setState({
      source: args.source,
      sourceImageKey: args.imageKey,
      sourcePhotoGeneration: sourceSelection.generation,
      ...(state.chrome ? { chrome: { ...state.chrome, currentPage: args.index } } : undefined),
    });
  }
  if (
    settledHero?.id === args.id &&
    settledHero.sourceKind === "swipe" &&
    settledHero.photoSessionToken === args.sessionToken
  ) {
    settledHero = {
      ...settledHero,
      source: args.source,
      sourceImageKey: args.imageKey,
      sourcePhotoGeneration: sourceSelection.generation,
      ...(settledHero.chrome
        ? { chrome: { ...settledHero.chrome, currentPage: args.index } }
        : undefined),
    };
  }
  return "synced";
};

/** Source paint registry survives callbacks that happen before reverse starts. */
export const markHeroSourcePhotoPainted = (args: {
  id: string;
  sourceInstanceToken: HeroPhotoSourceInstanceToken;
  imageKey: string;
  uri?: string;
  generation: number;
}): boolean => {
  const activeSession = [...photoSessions.values()].find(
    (session) => session.sourceInstanceToken === args.sourceInstanceToken,
  );
  if (
    activeSession &&
    (activeSession.imageKey !== args.imageKey ||
      activeSession.source.uri !== args.uri ||
      activeSession.generation !== args.generation)
  ) {
    return false;
  }
  paintedSourcePhotos.set(args.sourceInstanceToken, {
    imageKey: args.imageKey,
    uri: args.uri,
    generation: args.generation,
  });
  const runtime = reverseRuntime;
  if (
    !runtime ||
    runtime.id !== args.id ||
    runtime.sourceInstanceToken !== args.sourceInstanceToken ||
    runtime.expectedPhotoImageKey !== args.imageKey ||
    runtime.expectedPhotoUri !== args.uri ||
    runtime.expectedPhotoGeneration !== args.generation
  ) {
    return false;
  }
  runtime.sourcePhotoPainted = true;
  finishReverseHandoffIfReady();
  return true;
};

export const registerHeroActionFrame = (args: { id: string; role: "source"; frame: HeroFrame }) => {
  const cachedFrame = sourceActionFrames.get(args.id) ?? null;
  if (!areHeroFramesEquivalent(cachedFrame, args.frame)) {
    sourceActionFrames.set(args.id, args.frame);
  }
  // Action participation is snapshotted by startHero. If the source frame
  // arrives after navigation begins, cache it for the next transition.
};

/** Refresh action geometry only from a measurement started after safe settle. */
export const refreshSettledHeroActionFrame = (args: {
  id: string;
  forwardRunId: number;
  frame: HeroFrame;
}): boolean => {
  const owner = state.settledSourceOwner;
  if (
    state.phase !== null ||
    owner?.id !== args.id ||
    owner.sourceKind !== "swipe" ||
    settledHero?.id !== args.id ||
    settledHero.runId !== args.forwardRunId ||
    settledHero.sourceKind !== "swipe" ||
    !settledHero.chrome ||
    !settledHero.actionFrom
  ) {
    return false;
  }
  if (!areHeroFramesEquivalent(settledHero.actionTo, args.frame)) {
    settledHero = { ...settledHero, actionTo: args.frame };
  }
  return true;
};

export const unregisterHeroSourceActionFrame = (id: string) => {
  sourceActionFrames.delete(id);
};

/** A Swipe hero is eligible only when its action bar has a measured source. */
export const getHeroSourceActionFrame = (id: string): HeroFrame | null =>
  sourceActionFrames.get(id) ?? null;

/** Chat has target-only chrome; Swipe requires truthful frames at both ends. */
export const areHeroSharedElementsReady = (hero: HeroState): boolean =>
  Boolean(hero.to) &&
  Boolean(hero.goBackFrame) &&
  (!hero.sourceBio || Boolean(hero.sourceBioFrame)) &&
  (!hero.chrome ||
    (hero.sourceKind === "chat"
      ? Boolean(hero.phase === "reverse" ? hero.chromeFrom : hero.chromeTo)
      : Boolean(hero.chromeFrom) && Boolean(hero.chromeTo))) &&
  (!hero.chrome || !hero.actionFrom || Boolean(hero.actionTo)) &&
  (!hero.title || !hero.titleFrom || Boolean(hero.titleTo));

/** Native presentation, overlay paint and one atomic target tuple gate forward motion. */
export const isHeroForwardMotionReady = (hero: HeroState): boolean =>
  hero.phase === "forward" &&
  hero.destinationPresented &&
  hero.overlayReady &&
  areHeroSharedElementsReady(hero);

/** Imperative snapshot for deterministic store verification. */
export const getHeroStateSnapshot = (): HeroState => state;

/** Live JS-thread gate for queued carousel presses and query reconciliation. */
export const isHeroPhotoMutationAllowed = (): boolean => state.phase === null;

/**
 * Captures the exact forward generation owned by a newly focused destination
 * route. Settled generations remain private from ordinary subscribers so they
 * cannot accidentally drive UI, but Chat/no-session invalidation still needs
 * an ABA-safe capability instead of an id-only clear.
 */
export const getHeroOwnedForwardRunId = (args: {
  id: string;
  sourceKind: HeroSourceKind;
}): number | null => {
  if (state.id === args.id && state.sourceKind === args.sourceKind && state.phase === "forward") {
    return state.runId;
  }
  if (settledHero?.id === args.id && settledHero.sourceKind === args.sourceKind) {
    return settledHero.runId;
  }
  return null;
};

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
export const abandonHero = (
  id: string,
  runId?: number,
  reason: HeroForwardCancelReason = "abandoned",
) => {
  if (state.id !== id || state.phase !== "forward") return;
  if (runId !== undefined && state.runId !== runId) return;
  const abandonedRunId = state.runId;
  settledHero = null;
  reverseRuntime = null;
  state = { ...initialState, version: state.version + 1 };
  // Release the terminal owner before invoking the runtime's cancellation
  // callback. That callback is allowed to start a newer same-dog opening;
  // clearing afterwards would erase the new owner (an ABA race).
  clearHeroSourceOpeningOwner(id, false);
  clearForwardRuntime(abandonedRunId, reason, true);
  emit();
};

/**
 * Release only the forward ownership acquired by one mounted source instance.
 * The run id closes the same-dog ABA hole: a delayed React cleanup from an
 * older source must never abandon a newer forward run or clear its settled
 * reverse snapshot.
 */
export const releaseHeroSourceOwnership = (args: {
  id: string;
  sourceKind: HeroSourceKind;
  forwardRunId: number;
}): boolean => {
  if (
    state.phase === "forward" &&
    state.id === args.id &&
    state.sourceKind === args.sourceKind &&
    state.runId === args.forwardRunId
  ) {
    const photoSessionToken = state.photoSessionToken;
    endHeroPhotoSession(photoSessionToken);
    abandonHero(args.id, args.forwardRunId);
    return true;
  }

  // Any other active run owns the store now. In particular, once reverse
  // starts it owns both route removal and source handoff; an old forward
  // cleanup cannot revoke that ownership.
  if (state.phase !== null) return false;

  const owner = state.settledSourceOwner;
  if (
    settledHero?.id !== args.id ||
    settledHero.sourceKind !== args.sourceKind ||
    settledHero.runId !== args.forwardRunId ||
    owner?.id !== args.id ||
    owner.sourceKind !== args.sourceKind
  ) {
    return false;
  }

  const photoSessionToken = settledHero.photoSessionToken;
  settledHero = null;
  endHeroPhotoSession(photoSessionToken);
  setState({ settledSourceOwner: null });
  return true;
};

/**
 * Release only the forward snapshot captured by one DogProfile route. Swipe
 * routes must also present their opaque photo-session capability; a delayed
 * cleanup from an older same-dog visit cannot revoke a newer visit even when
 * its route parameters happen to match.
 */
export const releaseHeroRouteOwnership = (args: {
  id: string;
  sourceKind: HeroSourceKind;
  forwardRunId: number | null;
  photoSessionToken?: HeroPhotoSessionToken | null;
}): boolean => {
  if (args.forwardRunId === null) return false;

  const ownedHero =
    state.phase === "forward" &&
    state.id === args.id &&
    state.sourceKind === args.sourceKind &&
    state.runId === args.forwardRunId
      ? state
      : settledHero?.id === args.id &&
          settledHero.sourceKind === args.sourceKind &&
          settledHero.runId === args.forwardRunId
        ? settledHero
        : null;
  if (!ownedHero) return false;
  if (
    args.sourceKind === "swipe" &&
    (!args.photoSessionToken || ownedHero.photoSessionToken !== args.photoSessionToken)
  ) {
    return false;
  }

  return releaseHeroSourceOwnership({
    id: args.id,
    sourceKind: args.sourceKind,
    forwardRunId: args.forwardRunId,
  });
};

/**
 * A reverse snapshot is valid only while DogProfile still displays the photo
 * it entered with. Paging to different pixels invalidates the morph; Back
 * should use the normal route pop instead of flashing the entry image.
 */
export const invalidateHeroForContentChange = (
  id: string,
  expectedForwardRunId?: number | null,
) => {
  if (
    settledHero?.id === id &&
    (expectedForwardRunId === undefined || settledHero.runId === expectedForwardRunId)
  ) {
    endHeroPhotoSession(settledHero.photoSessionToken);
    settledHero = null;
    releaseSettledSourceOwner(id);
  }
  if (
    state.id === id &&
    state.phase === "forward" &&
    (expectedForwardRunId === undefined || state.runId === expectedForwardRunId)
  ) {
    abandonHero(id, state.runId);
  }
};

/** Scrolling changes the destination geometry but keeps the route photo session alive. */
export const invalidateHeroGeometryForScroll = (args: {
  id: string;
  photoSessionToken?: HeroPhotoSessionToken | null;
  /** Exact Chat/no-session generation; prevents an old route revoking a newer visit. */
  forwardRunId?: number | null;
}) => {
  const matchesOwner = (hero: HeroState) =>
    hero.photoSessionToken === (args.photoSessionToken ?? null) &&
    (args.photoSessionToken != null ||
      args.forwardRunId === undefined ||
      hero.runId === args.forwardRunId);
  if (settledHero?.id === args.id && matchesOwner(settledHero)) {
    settledHero = null;
    releaseSettledSourceOwner(args.id);
  }
  if (state.id === args.id && state.phase === "forward" && matchesOwner(state)) {
    abandonHero(args.id, state.runId);
  }
};

/**
 * Drop a reversible snapshot when iOS performs its native edge-pop. Active
 * manual reverse runs are left alone because they own their measured handoff.
 */
export const clearHeroForNativeFallback = (id: string) => {
  if (settledHero?.id === id) {
    endHeroPhotoSession(settledHero.photoSessionToken);
    settledHero = null;
    releaseSettledSourceOwner(id);
  }
  if (state.id === id && state.phase === "forward") abandonHero(id);
  if (
    state.id === id &&
    state.phase === "reverse" &&
    reverseRuntime?.id === id &&
    !reverseRuntime.routeRemovalDispatched
  ) {
    const runtime = reverseRuntime;
    clearTimeout(runtime.paintTimer);
    if (runtime.handoffTimer) clearTimeout(runtime.handoffTimer);
    scheduleOverlayClearConfirmation({
      id: runtime.id,
      runId: runtime.runId,
      photoSessionToken: runtime.photoSessionToken,
      postHandoff: runtime.callbacks.postHandoff,
    });
    reverseRuntime = null;
    state = {
      ...initialState,
      settledSourceOwner: state.settledSourceOwner,
      version: state.version + 1,
    };
    emit();
  }
};

const REVERSE_PAINT_WATCHDOG_MS = 700;
const REVERSE_HANDOFF_WATCHDOG_MS = 700;

const completeReverseRuntime = (runId: number) => {
  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId) return;
  clearTimeout(runtime.paintTimer);
  if (runtime.handoffTimer) clearTimeout(runtime.handoffTimer);
  if (!runtime.routeRemovalDispatched) {
    runtime.routeRemovalDispatched = true;
    runtime.callbacks.removeRoute();
  }
  scheduleOverlayClearConfirmation({
    id: runtime.id,
    runId: runtime.runId,
    photoSessionToken: runtime.photoSessionToken,
    postHandoff: runtime.callbacks.postHandoff,
  });
  reverseRuntime = null;
  state = {
    ...initialState,
    settledSourceOwner: state.settledSourceOwner,
    version: state.version + 1,
  };
  emit();
};

const beginReverseSceneFallback = (runId: number) => {
  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "awaiting-paint") return;
  clearTimeout(runtime.paintTimer);
  runtime.stage = "scene-fallback";
  // No flying overlay will cover the source in this path. Release the
  // settled hold while the still-opaque profile scene is above it, then let
  // the ordinary scene fade reveal the complete card.
  setState({
    settledSourceOwner: null,
    reverseFallback: "scene",
    overlayReady: false,
  });
  runtime.paintTimer = setTimeout(() => handleReverseWatchdog(runId), REVERSE_PAINT_WATCHDOG_MS);
};

const beginReverseHandoffRecovery = (runId: number) => {
  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "handoff") return;
  if (runtime.handoffTimer) clearTimeout(runtime.handoffTimer);
  runtime.stage = "handoff-recovery";
  setState({ reverseFallback: "handoff" });
  runtime.handoffTimer = setTimeout(
    () => handleReverseWatchdog(runId),
    REVERSE_HANDOFF_WATCHDOG_MS,
  );
};

export const completeReverseSceneFallback = (runId: number) => {
  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "scene-fallback") return;
  completeReverseRuntime(runId);
};

export const completeReverseHandoffRecovery = (runId: number) => {
  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId || runtime.stage !== "handoff-recovery") return;
  completeReverseRuntime(runId);
};

/** Never let a missing paint/motion/focus callback leave Back permanently locked. */
const handleReverseWatchdog = (runId: number) => {
  const runtime = reverseRuntime;
  if (!runtime || runtime.runId !== runId) return;

  switch (runtime.stage) {
    case "awaiting-paint":
      beginReverseSceneFallback(runId);
      return;
    case "motion":
      // The UI-thread completion callback may be lost after the visual motion
      // already landed. Enter the normal measured handoff instead of cutting.
      endHero(runId);
      return;
    case "handoff":
      beginReverseHandoffRecovery(runId);
      return;
    case "scene-fallback":
      completeReverseSceneFallback(runId);
      return;
    case "handoff-recovery":
      completeReverseHandoffRecovery(runId);
  }
};

export const startReverseHero = (
  id: string,
  callbacks: HeroReverseCallbacks,
): HeroReverseResult => {
  // Do not let a second navigation replace an action whose overlay-clear
  // confirmation is still pending. The completion is detached before its
  // callback runs, so a callback that reentrantly creates a new settled hero
  // cannot be consumed or overwritten by this outer reverse request.
  const pendingReverseCompletion = takeOverlayClearPending();
  if (pendingReverseCompletion) {
    finishOverlayClearPending(pendingReverseCompletion);
    return "completion-pending";
  }

  if (state.id === id && state.phase === "reverse") {
    // The first request owns both callback roles. A second Back or action is
    // ignored instead of appending another pop/swipe completion.
    return "in-flight";
  }

  // Back during an unfinished forward run cannot pop or abandon the overlay:
  // the transparent target scene is still cross-fading and has no reversible
  // snapshot yet. Its visible control and native edge gesture are disabled;
  // this synchronous guard also closes a queued hardware/programmatic Back.
  if (state.id === id && state.phase === "forward") {
    return "forward-in-flight";
  }

  if (!settledHero || settledHero.id !== id || !settledHero.from || !settledHero.to) {
    releaseSettledSourceOwner(id);
    return "unavailable";
  }

  const previous = settledHero;
  const photoSession = previous.photoSessionToken
    ? photoSessions.get(previous.photoSessionToken)
    : undefined;
  if (
    previous.sourceKind === "swipe" &&
    (!photoSession ||
      photoSession.id !== id ||
      !previous.sourceImageKey ||
      previous.sourcePhotoGeneration === null)
  ) {
    settledHero = null;
    releaseSettledSourceOwner(id);
    return "unavailable";
  }
  settledHero = null;
  const runId = ++nextHeroRunId;
  const requiredRoles = new Set<HeroSourceRole>(["photo"]);
  if (previous.chrome && previous.chromeFrom && previous.chromeTo) requiredRoles.add("chrome");
  if (previous.actionFrom && previous.actionTo) requiredRoles.add("action");
  if (previous.title && previous.titleFrom && previous.titleTo) requiredRoles.add("title");
  if (previous.sourceBio && previous.sourceBioFrame) requiredRoles.add("bio");

  const sourceInstanceToken = photoSession?.sourceInstanceToken ?? null;
  const paintedPhoto = sourceInstanceToken
    ? paintedSourcePhotos.get(sourceInstanceToken)
    : undefined;
  const sourcePhotoPaintRequired = previous.sourceKind === "swipe";
  const paintTimer = setTimeout(() => handleReverseWatchdog(runId), REVERSE_PAINT_WATCHDOG_MS);
  reverseRuntime = {
    id,
    runId,
    callbacks,
    requiredRoles,
    acknowledgedRoles: new Set(),
    animationLanded: false,
    routeRemovalDispatched: false,
    sourceFocused: false,
    sourcePhotoPaintRequired,
    sourcePhotoPainted:
      !sourcePhotoPaintRequired ||
      (paintedPhoto?.imageKey === previous.sourceImageKey &&
        paintedPhoto.uri === previous.source?.uri &&
        paintedPhoto.generation === previous.sourcePhotoGeneration),
    expectedPhotoUri: previous.source?.uri,
    expectedPhotoImageKey: previous.sourceImageKey,
    expectedPhotoGeneration: previous.sourcePhotoGeneration,
    sourceInstanceToken,
    photoSessionToken: previous.photoSessionToken,
    paintTimer,
    handoffTimer: null,
    stage: "awaiting-paint",
  };
  callbacks.onWillStart?.();
  setState({
    runId,
    id,
    source: previous.source,
    sourceKind: previous.sourceKind,
    settledSourceOwner:
      previous.id && previous.sourceKind
        ? { id: previous.id, sourceKind: previous.sourceKind }
        : null,
    photoSessionToken: previous.photoSessionToken,
    sourceImageKey: previous.sourceImageKey,
    sourcePhotoGeneration: previous.sourcePhotoGeneration,
    chrome: previous.chrome,
    cardSurface: previous.cardSurface,
    topSurfaceFromOpacity: previous.topSurfaceToOpacity,
    topSurfaceToOpacity: previous.topSurfaceFromOpacity,
    bottomSurfaceLocations: previous.bottomSurfaceLocations,
    title: previous.title,
    titleFrom: previous.titleTo,
    titleTo: previous.titleFrom,
    sourceBio: previous.sourceBio,
    sourceBioFrame: previous.sourceBioFrame,
    goBackFrame: previous.goBackFrame,
    phase: "reverse",
    from: previous.to,
    to: previous.from,
    chromeFrom: previous.chromeTo,
    chromeTo: previous.chromeFrom,
    actionFrom: previous.actionTo,
    actionTo: previous.actionFrom,
    shadowFrom: previous.shadowTo,
    shadowTo: previous.shadowFrom,
    overlayReady: false,
    destinationPresented: false,
    handoffPending: false,
    forwardFallback: null,
    forwardRecoveryKind: null,
    forwardGoBackCorrection: null,
    forwardPhotoCorrection: null,
    forwardGoBackRecoveryMode: null,
    reverseFallback: null,
  });
  return "started";
};

const expectedSourceFrameForRole = (role: HeroSourceRole): HeroFrame | null => {
  switch (role) {
    case "photo":
      return state.to;
    case "chrome":
      return state.chromeTo;
    case "action":
      return state.actionTo;
    case "title":
      return state.titleTo;
    case "bio":
      return state.sourceBioFrame;
  }
};

const finishReverseHandoffIfReady = () => {
  const runtime = reverseRuntime;
  if (
    !runtime ||
    runtime.stage !== "handoff" ||
    !runtime.animationLanded ||
    !runtime.routeRemovalDispatched ||
    !runtime.sourceFocused ||
    !runtime.sourcePhotoPainted
  ) {
    return;
  }
  for (const role of runtime.requiredRoles) {
    if (!runtime.acknowledgedRoles.has(role)) return;
  }
  if (state.id !== runtime.id || state.runId !== runtime.runId || state.phase !== "reverse") return;

  scheduleOverlayClearConfirmation({
    id: runtime.id,
    runId: runtime.runId,
    photoSessionToken: runtime.photoSessionToken,
    postHandoff: runtime.callbacks.postHandoff,
  });
  clearTimeout(runtime.paintTimer);
  if (runtime.handoffTimer) clearTimeout(runtime.handoffTimer);
  reverseRuntime = null;
  state = {
    ...initialState,
    settledSourceOwner: state.settledSourceOwner,
    version: state.version + 1,
  };
  emit();
};

/** Source route focus is necessary but insufficient: each shared frame acks separately. */
export const markHeroSourceFocused = (args: { id: string; runId: number }) => {
  const runtime = reverseRuntime;
  if (
    !runtime ||
    !runtime.animationLanded ||
    runtime.id !== args.id ||
    runtime.runId !== args.runId
  ) {
    return;
  }
  runtime.sourceFocused = true;
  finishReverseHandoffIfReady();
};

/**
 * A source only retakes ownership when its focused native frame still matches
 * the frame where the overlay landed. A stale or shifted measurement cannot
 * clear the overlay and expose a snap.
 */
export const acknowledgeHeroSourceFrame = (args: {
  id: string;
  runId: number;
  role: HeroSourceRole;
  frame: HeroFrame;
}): boolean => {
  const runtime = reverseRuntime;
  if (
    !runtime ||
    !runtime.animationLanded ||
    !runtime.sourceFocused ||
    runtime.id !== args.id ||
    runtime.runId !== args.runId ||
    !runtime.requiredRoles.has(args.role)
  ) {
    return false;
  }

  const expected = expectedSourceFrameForRole(args.role);
  if (!areHeroFramesEquivalent(expected, args.frame)) return false;
  runtime.acknowledgedRoles.add(args.role);
  finishReverseHandoffIfReady();
  return true;
};

/**
 * Called after React has committed the overlay's removal. The optional swipe
 * action cannot begin while the source is still hidden behind the overlay.
 */
export function confirmHeroOverlayCleared(runId: number) {
  const pending = takeOverlayClearPending(runId);
  if (!pending) return;
  finishOverlayClearPending(pending);
}

/** Clear the hero once the morph finishes (or is abandoned). */
export const endHero = (runId?: number) => {
  if (state.id === null) return;
  if (runId !== undefined && state.runId !== runId) return;
  const finished = state;

  if (finished.phase === "reverse") {
    const runtime = reverseRuntime;
    if (!runtime || runtime.runId !== finished.runId || runtime.animationLanded) return;
    clearTimeout(runtime.paintTimer);
    runtime.animationLanded = true;
    runtime.stage = "handoff";
    setState({ handoffPending: true });
    if (!runtime.routeRemovalDispatched) {
      runtime.routeRemovalDispatched = true;
      runtime.callbacks.removeRoute();
    }
    runtime.handoffTimer = setTimeout(
      () => handleReverseWatchdog(runtime.runId),
      REVERSE_HANDOFF_WATCHDOG_MS,
    );
    finishReverseHandoffIfReady();
    return;
  }

  if (finished.phase === "forward") {
    const runtime = forwardRuntime;
    if (runtime?.runId === finished.runId) {
      if (runtime.motionLanded) return;
      runtime.motionLanded = true;
      runtime.requiredTargetRoles = new Set<HeroTargetRole>(["photo", "goBack"]);
      if (finished.chrome && finished.chromeTo) runtime.requiredTargetRoles.add("chrome");
      if (finished.actionFrom && finished.actionTo) runtime.requiredTargetRoles.add("action");
      if (finished.title && finished.titleFrom && finished.titleTo) {
        runtime.requiredTargetRoles.add("title");
      }
      runtime.acknowledgedTargetRoles.clear();
      runtime.correctedTargetFrames.clear();
      runtime.recoveryRequested = false;
      runtime.forceUnsafeSnapshot = false;

      armForwardWatchdog(runtime, "target-handoff");
      setState({ handoffPending: true });
      finishForwardTargetHandoffIfReady();
      return;
    }

    if (finished.to) settledHero = { ...finished, overlayReady: false };
    if (finished.id) clearHeroSourceOpeningOwner(finished.id, false);
  }
  state = {
    ...initialState,
    settledSourceOwner:
      settledHero?.id && settledHero.sourceKind
        ? { id: settledHero.id, sourceKind: settledHero.sourceKind }
        : null,
    version: state.version + 1,
  };
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

export const useIsHeroSourceOpening = (id: string | undefined): boolean => {
  useHeroState();
  return isHeroSourceOpening(id);
};

/**
 * The motion source stays painted until the overlay image is ready. The
 * motion target hides immediately so navigation cannot reveal a full-size
 * duplicate behind the source-sized flying photo.
 */
export const isHeroSourceSurfaceHeld = (
  hero: HeroState,
  id: string | undefined,
  sourceKind?: HeroSourceKind,
): boolean => {
  if (!id) return false;
  // Failure recovery explicitly transfers ownership back to a real route.
  if (hero.phase === "reverse" && hero.reverseFallback !== null) return false;
  const activeSourceMatches = sourceKind === undefined || hero.sourceKind === sourceKind;
  const settledOwnerMatches =
    hero.settledSourceOwner?.id === id &&
    (sourceKind === undefined || hero.settledSourceOwner.sourceKind === sourceKind);
  return Boolean(
    (hero.id === id && hero.phase === "forward" && hero.overlayReady && activeSourceMatches) ||
    settledOwnerMatches,
  );
};

export const shouldHideHeroEndpointPhoto = (
  hero: HeroState,
  id: string | undefined,
  isForwardSource: boolean,
  sourceKind?: HeroSourceKind,
): boolean => {
  if (!id) return false;
  if (
    isForwardSource &&
    sourceKind !== undefined &&
    hero.phase !== null &&
    hero.sourceKind !== sourceKind
  ) {
    return false;
  }
  if (isForwardSource && isHeroSourceSurfaceHeld(hero, id, sourceKind)) return true;
  if (hero.id !== id || hero.phase === null) return false;
  // Forward recovery reveals the destination only. The source route remains
  // hidden underneath the target scene and can never flash back through FWO.
  if (hero.phase === "forward" && hero.forwardFallback === "target") {
    return isForwardSource;
  }
  // The landed overlay is fully opaque at q=0, so source endpoints can be
  // restored underneath it before q crossfades ownership back to the route.
  if (hero.phase === "reverse" && hero.reverseFallback === "handoff") {
    return !isForwardSource;
  }
  return hero.overlayReady;
};

/** Lock the real shared controls as soon as overlay ownership begins. */
export const isHeroInteractionLocked = (hero: HeroState, id: string | undefined): boolean =>
  Boolean(id) && hero.id === id && hero.phase !== null;

export const useIsHeroInteractionLocked = (id: string | undefined): boolean =>
  isHeroInteractionLocked(useHeroState(), id);

export const isHeroActionTransitionActive = (hero: HeroState, id: string | undefined): boolean =>
  Boolean(id) && hero.id === id && hero.phase !== null && Boolean(hero.actionFrom);

/** The overlay owns real action controls as soon as its measured copy participates. */
export const useIsHeroActionActive = (id: string | undefined): boolean =>
  isHeroActionTransitionActive(useHeroState(), id);

export const isHeroShadowTransitionActive = (hero: HeroState, id: string | undefined): boolean =>
  Boolean(id) &&
  hero.id === id &&
  hero.phase !== null &&
  hero.overlayReady &&
  (hero.shadowFrom.opacity > 0 ||
    hero.shadowTo.opacity > 0 ||
    hero.shadowFrom.elevation > 0 ||
    hero.shadowTo.elevation > 0);

export const useIsHeroShadowActive = (id: string | undefined): boolean =>
  isHeroShadowTransitionActive(useHeroState(), id);

/** Test-only reset used by the durable store harness. */
export const resetHeroTransitionForVerification = () => {
  if (forwardRuntime) forwardTimerScheduler.clear(forwardRuntime.timer);
  if (reverseRuntime) {
    clearTimeout(reverseRuntime.paintTimer);
    if (reverseRuntime.handoffTimer) clearTimeout(reverseRuntime.handoffTimer);
  }
  state = initialState;
  nextHeroRunId = 0;
  settledHero = null;
  forwardRuntime = null;
  reverseRuntime = null;
  discardOverlayClearPending();
  sourceActionFrames.clear();
  photoSessions.clear();
  paintedSourcePhotos.clear();
  openingHeroSources.clear();
  openingHeroSourceCancellations.clear();
  nextPhotoSessionToken = 0;
  nextPhotoSourceInstanceToken = 0;
  emit();
};
