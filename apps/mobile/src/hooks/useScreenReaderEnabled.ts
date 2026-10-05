import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

let screenReaderEnabled = true;
let started = false;
let subscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
let generation = 0;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

const setScreenReaderEnabled = (enabled: boolean) => {
  if (screenReaderEnabled === enabled) return;
  screenReaderEnabled = enabled;
  emit();
};

const startScreenReaderSubscription = () => {
  if (started) return;
  started = true;
  const activeGeneration = ++generation;

  void AccessibilityInfo.isScreenReaderEnabled()
    .then((enabled) => {
      if (generation === activeGeneration) setScreenReaderEnabled(enabled);
      return enabled;
    })
    .catch(() => {
      // Stay conservative: manual motion remains disabled when the native read fails.
    });
  subscription = AccessibilityInfo.addEventListener("screenReaderChanged", (enabled) => {
    if (generation === activeGeneration) setScreenReaderEnabled(enabled);
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  startScreenReaderSubscription();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    generation++;
    subscription?.remove();
    subscription = null;
    started = false;
    screenReaderEnabled = true;
  };
};

/**
 * Defaults to enabled until the native preference resolves, preventing the
 * first interaction from starting a manual transition for screen-reader users.
 */
export const useScreenReaderEnabled = (): boolean => {
  return useSyncExternalStore(subscribe, () => screenReaderEnabled);
};
