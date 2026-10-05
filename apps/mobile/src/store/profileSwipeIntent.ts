import { useSyncExternalStore } from "react";

import {
  beginSwipeActionFlight,
  endSwipeActionFlight,
  isSwipeActionFlightOwner,
  type SwipeActionFlightToken,
} from "@/store/swipeActionFlight";
import { Swipe } from "@/store/swipeTypes";

export interface ProfileSwipeIntent {
  dogId: string;
  sessionId: number;
  swipeType: Swipe;
  token: SwipeActionFlightToken;
}

let pendingIntent: ProfileSwipeIntent | null = null;
const listeners = new Set<() => void>();

const emit = () => {
  for (const listener of listeners) listener();
};

export const queueProfileSwipeIntent = (
  input: Omit<ProfileSwipeIntent, "token">,
): ProfileSwipeIntent | null => {
  if (pendingIntent) {
    return pendingIntent.dogId === input.dogId &&
      pendingIntent.sessionId === input.sessionId &&
      pendingIntent.swipeType === input.swipeType &&
      isSwipeActionFlightOwner(pendingIntent.token)
      ? pendingIntent
      : null;
  }

  const token = beginSwipeActionFlight(input.dogId, "swipe");
  if (!token) return null;

  pendingIntent = { ...input, token };
  emit();
  return pendingIntent;
};

export const consumeProfileSwipeIntent = (expected: {
  dogId: string;
  sessionId: number;
  token: SwipeActionFlightToken;
}): ProfileSwipeIntent | null => {
  if (
    !pendingIntent ||
    pendingIntent.dogId !== expected.dogId ||
    pendingIntent.sessionId !== expected.sessionId ||
    pendingIntent.token !== expected.token ||
    !isSwipeActionFlightOwner(expected.token)
  ) {
    return null;
  }

  const claimed = pendingIntent;
  pendingIntent = null;
  emit();
  return claimed;
};

export const cancelProfileSwipeIntent = (expectedToken?: SwipeActionFlightToken): boolean => {
  if (!pendingIntent || (expectedToken && pendingIntent.token !== expectedToken)) return false;
  const cancelled = pendingIntent;
  pendingIntent = null;
  endSwipeActionFlight(cancelled.token);
  emit();
  return true;
};

export const getProfileSwipeIntentSnapshot = () => pendingIntent;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useProfileSwipeIntent = () =>
  useSyncExternalStore(subscribe, getProfileSwipeIntentSnapshot, getProfileSwipeIntentSnapshot);

export const resetProfileSwipeIntentForVerification = () => {
  const intent = pendingIntent;
  pendingIntent = null;
  if (intent) endSwipeActionFlight(intent.token);
  emit();
};
