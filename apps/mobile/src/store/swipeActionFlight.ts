import { useSyncExternalStore } from "react";

export type SwipeActionFlightToken = string;

type SwipeActionFlight =
  | {
      dogId: string | null;
      kind: "action";
      purpose: "interaction" | "swipe";
      token: SwipeActionFlightToken;
    }
  | {
      dogId: string;
      kind: "restore";
      phase: "claimed" | "committed" | "pending";
      token: SwipeActionFlightToken;
    };

let activeFlight: SwipeActionFlight | null = null;
let nextToken = 0;
let restoreClaimTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const RESTORE_CLAIM_TIMEOUT_MS = 1_500;

const emit = () => {
  for (const listener of listeners) listener();
};

const createToken = (kind: "action" | "restore") =>
  `swipe-${kind}-flight-${++nextToken}` as SwipeActionFlightToken;

const clearRestoreClaimTimer = () => {
  if (restoreClaimTimer) clearTimeout(restoreClaimTimer);
  restoreClaimTimer = null;
};

const expirePendingRestore = (token: SwipeActionFlightToken) => {
  if (
    activeFlight?.kind !== "restore" ||
    activeFlight.phase !== "pending" ||
    activeFlight.token !== token
  ) {
    return false;
  }

  clearRestoreClaimTimer();
  activeFlight = null;
  emit();
  return true;
};

const schedulePendingRestoreCleanup = (token: SwipeActionFlightToken) => {
  clearRestoreClaimTimer();
  restoreClaimTimer = setTimeout(() => {
    restoreClaimTimer = null;
    expirePendingRestore(token);
  }, RESTORE_CLAIM_TIMEOUT_MS);
};

/** One swipe action owns every interactive card surface until it settles. */
export const beginSwipeActionFlight = (
  dogId?: string,
  purpose: "interaction" | "swipe" = "interaction",
): SwipeActionFlightToken | null => {
  if (activeFlight) return null;
  const token = createToken("action");
  activeFlight = { dogId: dogId ?? null, kind: "action", purpose, token };
  emit();
  return token;
};

/**
 * Atomically transfers the global surface lock to the dog Redux is about to
 * restore. Replacing an action token makes its delayed settle callback stale
 * without ever exposing an unlocked frame.
 */
export const beginSwipeRestoreFlight = (dogId: string): SwipeActionFlightToken | null => {
  if (
    activeFlight &&
    (activeFlight.kind === "restore" ||
      activeFlight.dogId !== dogId ||
      activeFlight.purpose !== "swipe")
  ) {
    return null;
  }

  const token = createToken("restore");
  activeFlight = { dogId, kind: "restore", phase: "pending", token };
  schedulePendingRestoreCleanup(token);
  emit();
  return token;
};

/**
 * Cross the Redux mutation boundary atomically. Only uncommitted leases may
 * expire; once Redux can reveal the dog, its reset lease must survive a slow
 * render/background resume until the exact handler claims or cancels it.
 */
export const commitSwipeRestoreFlight = (dogId: string, token: SwipeActionFlightToken): boolean => {
  if (
    activeFlight?.kind !== "restore" ||
    activeFlight.phase !== "pending" ||
    activeFlight.dogId !== dogId ||
    activeFlight.token !== token
  ) {
    return false;
  }

  activeFlight = { ...activeFlight, phase: "committed" };
  clearRestoreClaimTimer();
  return true;
};

/** Only the SwipeHandler for the dog that became current can claim the committed reset. */
export const claimSwipeRestoreFlight = (dogId: string): SwipeActionFlightToken | null => {
  if (
    activeFlight?.kind !== "restore" ||
    activeFlight.phase !== "committed" ||
    activeFlight.dogId !== dogId
  ) {
    return null;
  }

  activeFlight = { ...activeFlight, phase: "claimed" };
  clearRestoreClaimTimer();
  return activeFlight.token;
};

export const isSwipeActionFlightOwner = (token: SwipeActionFlightToken | null | undefined) =>
  Boolean(token && activeFlight?.token === token);

/** A stale completion cannot unlock a newer action. */
export const endSwipeActionFlight = (token: SwipeActionFlightToken | null | undefined) => {
  if (!token || activeFlight?.token !== token) return false;
  clearRestoreClaimTimer();
  activeFlight = null;
  emit();
  return true;
};

/** Cancel only a restore lease, optionally scoped to the handler that unmounted. */
export const cancelSwipeRestoreFlight = (dogId?: string): boolean => {
  if (activeFlight?.kind !== "restore" || (dogId && activeFlight.dogId !== dogId)) return false;
  return endSwipeActionFlight(activeFlight.token);
};

export const getIsSwipeActionInFlight = () => activeFlight !== null;

/** Subscribes to ownership changes; callers can re-check Redux before restoring. */
export const waitForSwipeActionFlightIdle = (timeoutMs: number): Promise<boolean> => {
  if (!activeFlight) return Promise.resolve(true);

  let timeout: ReturnType<typeof setTimeout> | null = null;
  let onOwnershipChange!: () => void;
  const idle = new Promise<boolean>((resolve) => {
    onOwnershipChange = () => {
      if (activeFlight) return;
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

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useIsSwipeActionInFlight = () =>
  useSyncExternalStore(subscribe, getIsSwipeActionInFlight, getIsSwipeActionInFlight);

export const resetSwipeActionFlightForVerification = () => {
  clearRestoreClaimTimer();
  activeFlight = null;
  nextToken = 0;
  emit();
};

export const expirePendingSwipeRestoreForVerification = expirePendingRestore;
