import { useSyncExternalStore } from "react";
import { AccessibilityInfo, Platform } from "react-native";

import type { ReduceTransparencyPreference } from "@/services/blurSurfaceMode";

export type { ReduceTransparencyPreference } from "@/services/blurSurfaceMode";

interface ReduceTransparencyState {
  bootstrapStarted: boolean;
  bootstrapTimer: ReturnType<typeof setTimeout> | null;
  eventRevision: number;
  listeners: Set<() => void>;
  preference: ReduceTransparencyPreference;
}

const GLOBAL_STATE_KEY = "__pegadaReduceTransparencyStateV1";
const BOOTSTRAP_TIMEOUT_MS = 1_000;

type GlobalWithReduceTransparencyState = typeof globalThis & {
  [GLOBAL_STATE_KEY]?: ReduceTransparencyState;
};

const globalState = globalThis as GlobalWithReduceTransparencyState;

/**
 * Keep the state and native subscription stable through Fast Refresh. Metro
 * can re-evaluate this module without tearing down native event listeners; a
 * module-local store would leak a listener and leave the new React subscribers
 * attached to a different cache after every refresh.
 */
const state = (globalState[GLOBAL_STATE_KEY] ??= {
  bootstrapStarted: false,
  bootstrapTimer: null,
  eventRevision: 0,
  listeners: new Set(),
  preference: Platform.OS === "ios" ? null : false,
});

const publish = (enabled: boolean) => {
  if (state.preference === enabled) return;
  state.preference = enabled;
  state.listeners.forEach((listener) => listener());
};

const clearBootstrapTimer = () => {
  if (state.bootstrapTimer === null) return;
  clearTimeout(state.bootstrapTimer);
  state.bootstrapTimer = null;
};

/**
 * One cached preference source for the lifetime of the JS runtime.
 * The native event listener starts before the async read so a newer event can
 * never be overwritten by an older bootstrap result.
 */
const bootstrapPreference = () => {
  if (state.bootstrapStarted) return;
  state.bootstrapStarted = true;

  if (Platform.OS !== "ios") return;

  const bootstrapRevision = state.eventRevision;

  try {
    // Keep this process-lifetime subscription alive even when no glass
    // surface is mounted so the next surface starts from a current cache.
    AccessibilityInfo.addEventListener("reduceTransparencyChanged", (enabled) => {
      state.eventRevision += 1;
      clearBootstrapTimer();
      publish(enabled);
    });

    const readInitialPreference = async () => {
      let enabled: boolean;

      try {
        enabled = await AccessibilityInfo.isReduceTransparencyEnabled();
      } catch {
        // Unknown accessibility state must never opt the user into
        // transparency. A later native event can still recover the cache.
        if (state.eventRevision === bootstrapRevision) {
          clearBootstrapTimer();
          state.eventRevision += 1;
          publish(true);
        }
        return;
      }

      if (state.eventRevision === bootstrapRevision) {
        clearBootstrapTimer();
        publish(enabled);
      }
    };

    void readInitialPreference();

    // The native implementation resolves synchronously through a callback,
    // but do not let a broken bridge leave the launch screen up forever. Once
    // this deadline settles opaque, the stale bootstrap result is ignored; a
    // later real accessibility event can still update the preference.
    state.bootstrapTimer = setTimeout(() => {
      state.bootstrapTimer = null;

      if (state.eventRevision !== bootstrapRevision || state.preference !== null) return;

      state.eventRevision += 1;
      publish(true);
    }, BOOTSTRAP_TIMEOUT_MS);
  } catch {
    // A missing native contract is treated as Reduce Transparency enabled.
    clearBootstrapTimer();
    state.eventRevision += 1;
    publish(true);
  }
};

bootstrapPreference();

export const reduceTransparencyStore = {
  getSnapshot: () => state.preference,
  subscribe: (listener: () => void) => {
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  },
};

/** One shared, live accessibility preference for every blur-backed surface. */
export const useReduceTransparencyEnabled = (): ReduceTransparencyPreference =>
  useSyncExternalStore(
    reduceTransparencyStore.subscribe,
    reduceTransparencyStore.getSnapshot,
    reduceTransparencyStore.getSnapshot,
  );
