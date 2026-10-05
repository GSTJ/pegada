import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

let reduceMotionEnabled = true;
let started = false;
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
let generation = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const setReduceMotionEnabled = (enabled: boolean) => {
  if (reduceMotionEnabled === enabled) return;
  reduceMotionEnabled = enabled;
  emit();
};

const startReduceMotionSubscription = () => {
  if (started) return;
  started = true;
  const activeGeneration = ++generation;

  void AccessibilityInfo.isReduceMotionEnabled()
    .then((enabled) => {
      if (generation === activeGeneration) setReduceMotionEnabled(enabled);
      return enabled;
    })
    .catch(() => {
      // Stay conservative: motion remains reduced when the native read fails.
    });
  subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
    if (generation === activeGeneration) setReduceMotionEnabled(enabled);
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  startReduceMotionSubscription();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    generation++;
    subscription?.remove();
    subscription = null;
    started = false;
    // A later mount starts conservatively again until its own generation's
    // native read resolves. It must not inherit a stale permissive `false`.
    reduceMotionEnabled = true;
  };
};

/**
 * Defaults to reduced motion until the native preference resolves. This keeps
 * the first interaction from starting a motion the user may have disabled.
 */
export const useReduceMotion = (): boolean => {
  return useSyncExternalStore(subscribe, () => reduceMotionEnabled);
};
