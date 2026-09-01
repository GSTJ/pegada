import { useSyncExternalStore } from "react";

/**
 * The dog id from a `/dog/<id>` deep link that arrived before, or during,
 * authentication. Held in a module-local binding with an accessor rather
 * than exported as a `let` (see initial-notification.ts for why), plus a
 * subscription list on top of that shape: a *warm* link can arrive while the
 * app is already sitting on its authenticated home route, where nothing else
 * re-renders on its own to notice the value changed -- `usePendingDogProfileId`
 * is what lets `usePendingDogProfile` (services/linking/index.ts) react to it.
 */
let pendingDogProfileId: string | undefined;
const listeners = new Set<() => void>();

export const getPendingDogProfile = () => pendingDogProfileId;

export const setPendingDogProfile = (id?: string) => {
  pendingDogProfileId = id;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const usePendingDogProfileId = () =>
  useSyncExternalStore(subscribe, getPendingDogProfile);
