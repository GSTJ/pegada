import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SwipeRequestFeedback from "./index";

/**
 * This screen renders behind the deck on every visit to the swipe tab, not
 * only when the deck runs out — the cards are stacked on top of it in
 * `views/(tabs)/Swipe/index.tsx`. What is pinned here is that the whole
 * empty state is in the tree only when the deck is genuinely empty, so the
 * empty deck funnel's tap rate is not divided by every visit to the tab.
 *
 * Rendering goes through `react-dom/server`, matching the other suites in
 * this package: there is no React Native renderer here, so the RN-flavoured
 * imports are stubbed. Names are `mock`-prefixed because jest hoists the
 * factories.
 */

type RequestState = {
  loading: boolean;
  error: boolean;
  data: { id: string }[];
};

let mockRequest: RequestState = { loading: false, error: false, data: [] };
let mockLastCardId: string | undefined;
let mockOffline = false;
let mockAlertRequestedAt: Date | undefined;

// The two buttons this screen already owned both talk to the API, and the
// real client reaches `expo-constants`, which ships untransformed ESM.
jest.mock<Record<string, unknown>>("@/contexts/trpc-provider", () => ({
  api: {
    user: {
      requestNewDogsAlert: {
        useMutation: () => ({ mutateAsync: () => Promise.resolve() }),
      },
      me: {
        useQuery: () => ({
          data: { newDogsAlertRequestedAt: mockAlertRequestedAt },
          isPending: false,
        }),
      },
    },
  },
}));

jest.mock<Record<string, unknown>>("react-native", () => {
  const { createElement } = require("react") as typeof React;

  return {
    View: ({ children }: { children?: React.ReactNode }) =>
      createElement("div", null, children),
    Alert: { alert: () => undefined },
    Share: { share: () => Promise.resolve({ action: "dismissedAction" }) },
    // The invite button reaches `@/constants`, which sizes the swipe card off
    // the screen at import time. Any number will do; nothing here reads it.
    Dimensions: { get: () => ({ width: 390, height: 844 }) },
  };
});

jest.mock<Record<string, unknown>>("./styles", () => {
  const { createElement } = require("react") as typeof React;
  const passthrough =
    (tag: string) =>
    ({ children }: { children?: React.ReactNode }) =>
      createElement(tag, null, children);

  return {
    styles: {
      container: {},
      scroll: {},
      emptyAnimation: {},
      logoLoading: {},
      title: {},
      description: {},
      notifyDone: {},
      notifyDoneText: {},
    },
    Container: passthrough("div"),
    Content: passthrough("div"),
    EmptyAnimation: passthrough("div"),
    LogoLoading: passthrough("div"),
    Title: passthrough("span"),
    Description: passthrough("span"),
    DoneCheck: () => createElement("svg", null),
    DoneLabel: passthrough("span"),
  };
});

jest.mock<Record<string, unknown>>("@/components/NetworkBoundary", () => ({
  OfflineComponent: () => null,
  RequestErrorComponent: () => null,
  useIsOffline: () => mockOffline,
}));

jest.mock<Record<string, unknown>>(
  "@/components/NetworkBoundary/styles",
  () => {
    const { createElement } = require("react") as typeof React;
    const passthrough = ({ children }: { children?: React.ReactNode }) =>
      createElement("div", null, children);

    return { Container: passthrough, Content: passthrough };
  },
);

jest.mock<Record<string, unknown>>("@/components/Button", () => {
  const { createElement } = require("react") as typeof React;

  return {
    Button: ({ children }: { children?: React.ReactNode }) =>
      createElement("button", { type: "button" }, children),
  };
});

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

// Reaches `magic-observability/expo`, ESM that jest cannot parse.
jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: () => undefined,
}));

jest.mock<Record<string, unknown>>(
  "@/services/get-push-notification-token",
  () => ({
    getPushNotificationToken: () => Promise.resolve(undefined),
    isPushDeniedError: () => false,
    setPushNotificationToken: () => Promise.resolve(),
  }),
);

jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  StorageKeys: { NewDogsAlertRequested: "newDogsAlertRequested" },
  getData: () => Promise.resolve(null),
  storeData: () => Promise.resolve(),
}));

jest.mock<Record<string, unknown>>("@/store/reducers", () => ({
  Actions: { dogs: { list: { refetch: jest.fn() } } },
}));

jest.mock<Record<string, unknown>>("@/types/scene-name", () => ({
  SceneName: { Preferences: "/preferences" },
}));

jest.mock<Record<string, unknown>>("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock<Record<string, unknown>>("react-native-reanimated", () => {
  const { createElement } = require("react") as typeof React;

  return {
    __esModule: true,
    default: {
      View: ({ children }: { children?: React.ReactNode }) =>
        createElement("div", null, children),
    },
    FadeInDown: {},
    FadeOutDown: {},
  };
});

// The real `getActiveCards` runs against this state, so the swipe-back rule
// it encodes (the dog just swiped stays in `data` and only leaves the active
// cards) is exercised here rather than restated.
jest.mock<Record<string, unknown>>("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({
      dogs: { request: mockRequest, config: { lastCardId: mockLastCardId } },
    }),
}));

beforeEach(() => {
  mockRequest = { loading: false, error: false, data: [] };
  mockLastCardId = undefined;
  mockOffline = false;
  mockAlertRequestedAt = undefined;
});

test("drops the button chrome once the notify opt-in has been taken", () => {
  mockAlertRequestedAt = new Date();

  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);
  const done = "swipeRequestFeedback.notifyNewDogsDone";

  // A disabled button paints its label at half opacity, which put this at
  // 1.7:1 on the light background with nothing saying why it would not
  // respond. There is nothing to press any more, so it is not a button.
  expect(html).toContain(done);
  expect(html).not.toContain(`<button type="button">${done}`);
  expect(html).not.toContain("swipeRequestFeedback.notifyNewDogsButton");
});

test("renders nothing at all while cards are still on the deck", () => {
  mockRequest = { loading: false, error: false, data: [{ id: "dog-1" }] };

  const html = renderToStaticMarkup(
    <SwipeRequestFeedback deckIsEmpty={false} />,
  );

  // The whole empty state stays out of the tree behind a full deck, which is
  // what keeps `Empty Deck Shown` off a deck that still has cards on it.
  expect(html).not.toContain("swipeRequestFeedback.emptyTitle");
});
