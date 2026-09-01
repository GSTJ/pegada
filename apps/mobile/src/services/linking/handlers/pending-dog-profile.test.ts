import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * `usePendingDogProfileId` is a thin `useSyncExternalStore(subscribe, get)`
 * wrapper, and `subscribe` is a module-private closure over the `listeners`
 * Set — never exported, so there is nothing to call directly to prove
 * subscribers actually get notified. Capturing the `subscribe` argument
 * React would otherwise receive gives a handle on that exact closure
 * without needing a live renderer: this package has none (see the other
 * tests under src/ for why `renderToStaticMarkup` is the only renderer on
 * hand, and it has no commit phase to run a real subscription through).
 */
let capturedSubscribe: ((listener: () => void) => () => void) | undefined;

jest.mock<Record<string, unknown>>("react", () => {
  const actual = jest.requireActual("react") as typeof React;
  return {
    ...actual,
    useSyncExternalStore: (
      subscribe: (listener: () => void) => () => void,
      getSnapshot: () => unknown,
    ) => {
      capturedSubscribe = subscribe;
      return getSnapshot();
    },
  };
});

import {
  getPendingDogProfile,
  setPendingDogProfile,
  usePendingDogProfileId,
} from "./pending-dog-profile";

const Harness = () => {
  const id = usePendingDogProfileId();
  return React.createElement("span", null, id ?? "none");
};

const render = () => renderToStaticMarkup(React.createElement(Harness));

afterEach(() => {
  setPendingDogProfile(undefined);
  capturedSubscribe = undefined;
});

test("has no pending id by default", () => {
  expect(getPendingDogProfile()).toBeUndefined();
});

test("set stores the id", () => {
  setPendingDogProfile("dog-1");

  expect(getPendingDogProfile()).toBe("dog-1");
});

test("set with no argument clears the id", () => {
  setPendingDogProfile("dog-1");

  setPendingDogProfile(undefined);

  expect(getPendingDogProfile()).toBeUndefined();
});

test("usePendingDogProfileId reflects the current value at render time", () => {
  setPendingDogProfile("dog-2");

  expect(render()).toContain("dog-2");
});

test("usePendingDogProfileId is undefined when nothing is pending", () => {
  expect(render()).toContain("none");
});

test("notifies every subscriber when the id changes, stops after unsubscribe", () => {
  render();
  expect(capturedSubscribe).toBeDefined();

  const listenerA = jest.fn();
  const listenerB = jest.fn();
  const unsubscribeA = capturedSubscribe!(listenerA);
  const unsubscribeB = capturedSubscribe!(listenerB);

  setPendingDogProfile("dog-3");

  expect(listenerA).toHaveBeenCalledTimes(1);
  expect(listenerB).toHaveBeenCalledTimes(1);

  unsubscribeA();
  setPendingDogProfile("dog-4");

  expect(listenerA).toHaveBeenCalledTimes(1);
  expect(listenerB).toHaveBeenCalledTimes(2);

  unsubscribeB();
  setPendingDogProfile("dog-5");

  expect(listenerB).toHaveBeenCalledTimes(2);
});
