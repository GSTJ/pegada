import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { router } from "expo-router";

/**
 * Deliberately NOT colocated next to `src/app/dog/[id].tsx`, the way every
 * other test in this package sits next to its subject. `src/app` is
 * expo-router's route root, and its `require.context` (expo-router/_ctx.ios.js)
 * matches EVERY `.tsx` under it except `+api`/`+html`/`+middleware` — there is
 * no exclusion for `.test.`/`.spec.`. A test file left in there becomes a real
 * route in dev AND release, and the router eagerly requires every route module
 * at startup. This file's top-level `react-dom/server` import then resolves to
 * `server.browser.js`, which touches `MessageChannel` — a global Hermes does
 * not have — so the app threw `ReferenceError: Property 'MessageChannel'
 * doesn't exist` before it painted a single frame and died on launch.
 * `no-test-files-in-router-root.test.ts` is the guard that keeps it out.
 *
 * The defect this file guards: a warm `pegada://dog/<id>` link (app already
 * running, e.g. sitting on SignIn while logged out) gets PUSHED on top of
 * the running app. This screen renders `null`, and root `_layout.tsx`'s
 * auth-redirect effect keys on `initialRouteName`, which does not change
 * for a logged out user, so nothing ever navigated away from the invisible
 * frame. It was a permanent blank screen that `back` could not recover.
 */

let mockId: string | undefined = "dog-1";

jest.mock<Partial<typeof import("expo-router")>>("expo-router", () => ({
  // Cast because the real signature promises `string`, which is the very
  // lie the screen guards against: expo-router hands back `undefined` for a
  // malformed link and for the render before it has parsed the URL.
  useLocalSearchParams: (() => ({
    id: mockId,
  })) as unknown as typeof import("expo-router").useLocalSearchParams,
  router: {
    canGoBack: jest.fn(() => false),
    back: jest.fn(),
  } as unknown as typeof import("expo-router").router,
}));

jest.mock<Record<string, unknown>>(
  "@/services/linking/handlers/pending-dog-profile",
  () => ({ setPendingDogProfile: jest.fn() }),
);

let mockToken: string | undefined;

jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  StorageKeys: { Token: "token" },
  getData: jest.fn(() => Promise.resolve(mockToken)),
}));

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

// Same reason as services/linking/index.test.ts: `renderToStaticMarkup` is
// the only renderer this package has and it has no commit phase, so a real
// `useEffect` would never fire. Running it inline stands in for "the effect
// ran".
jest.mock<Record<string, unknown>>("react", () => {
  const actual = jest.requireActual("react") as typeof React;
  return { ...actual, useEffect: (effect: () => void) => effect() };
});

import DogLink from "@/app/dog/[id]";
import LocalizedDogLink from "@/app/pt-br/dog/[id]";
import { analytics } from "@/services/analytics";
import { setPendingDogProfile } from "@/services/linking/handlers/pending-dog-profile";

const canGoBack = jest.mocked(router.canGoBack);
const back = jest.mocked(router.back);
const track = jest.mocked(analytics.track);
const setPending = jest.mocked(setPendingDogProfile);

// `clearMocks` is on, so the return value has to be re-declared per test.
beforeEach(() => {
  mockId = "dog-1";
  mockToken = undefined;
  canGoBack.mockReturnValue(false);
});

const render = () => renderToStaticMarkup(React.createElement(DogLink));

// The effect fires `trackLinkOpened`, whose first await is the stored token.
const flush = () =>
  new Promise<void>((resolve) => {
    setImmediate(resolve);
  });

test("cold start leaves the route in place for _layout to replace", () => {
  canGoBack.mockReturnValue(false);

  render();

  expect(back).not.toHaveBeenCalled();
  expect(setPending).toHaveBeenCalledWith("dog-1");
});

test("a warm link pops itself off, so the screen underneath comes back", () => {
  canGoBack.mockReturnValue(true);

  render();

  expect(back).toHaveBeenCalledTimes(1);
});

test("a warm link pops BEFORE storing the id, never after", () => {
  canGoBack.mockReturnValue(true);

  render();

  // Reversed, storing the id would push the profile (usePendingDogProfile
  // reacts to it) and the pop would then take that profile straight off
  // again. `invocationCallOrder` is jest's global, monotonic call counter,
  // so it orders calls across two separate mocks.
  expect(back.mock.invocationCallOrder[0]).toBeLessThan(
    setPending.mock.invocationCallOrder[0]!,
  );
});

test("stores the id either way, so the pending hand off still happens", () => {
  canGoBack.mockReturnValue(true);

  render();

  expect(setPending).toHaveBeenCalledWith("dog-1");
});

test("a link with no id does nothing at all", () => {
  canGoBack.mockReturnValue(true);
  mockId = undefined;

  render();

  // Popping here would throw away a screen for a link that names no dog,
  // and clearing the store would drop an id a previous link had just set.
  expect(back).not.toHaveBeenCalled();
  expect(setPending).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalled();
});

test("reports the link as opened, logged out", async () => {
  render();
  await flush();

  expect(track).toHaveBeenCalledWith({
    event_type: "Dog Link Opened",
    event_properties: { authenticated: false },
  });
});

test("reports the link as opened, logged in", async () => {
  mockToken = "a-token";

  render();
  await flush();

  expect(track).toHaveBeenCalledWith({
    event_type: "Dog Link Opened",
    event_properties: { authenticated: true },
  });
});

// iOS and Android both claim `/pt-br/dog/*` (see the AASA route and
// app.config.ts). A route file has to exist at that exact path or the link
// opens the app onto expo-router's Unmatched Route, and it has to be this
// screen or the localized link behaves differently from the plain one.
test("the pt-br locale prefix resolves to the very same screen", () => {
  expect(LocalizedDogLink).toBe(DogLink);
});
