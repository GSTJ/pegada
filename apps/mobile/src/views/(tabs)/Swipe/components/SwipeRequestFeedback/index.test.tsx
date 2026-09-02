import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import SwipeRequestFeedback from "./index";

/**
 * This screen renders behind the deck on every visit to the swipe tab, not
 * only when the deck runs out — the cards are stacked on top of it in
 * `views/(tabs)/Swipe/index.tsx`. What is pinned here is that the share
 * prompt is in the tree only when the deck is genuinely empty, the same
 * condition `Empty Deck Shown` is gated on. The prompt fires
 * `Share Prompt Shown` on mount, so one mounted behind a full deck is
 * invisible and counted anyway, and the empty deck funnel's tap rate comes
 * out divided by every visit to the tab.
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
let mockOffline = false;

jest.mock<Record<string, unknown>>("react-native", () => {
  const { createElement } = require("react") as typeof React;

  return {
    View: ({ children }: { children?: React.ReactNode }) =>
      createElement("div", null, children),
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
      emptyAnimation: {},
      logoLoading: {},
      title: {},
      description: {},
    },
    Container: passthrough("div"),
    Content: passthrough("div"),
    EmptyAnimation: passthrough("div"),
    LogoLoading: passthrough("div"),
    Title: passthrough("span"),
    Description: passthrough("span"),
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

jest.mock<Record<string, unknown>>("@/components/SharePromptCard", () => {
  const { createElement } = require("react") as typeof React;

  return {
    SharePromptCard: ({ placement }: { placement: string }) =>
      createElement("div", null, `share-prompt:${placement}`),
  };
});

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

jest.mock<Record<string, unknown>>("react-redux", () => ({
  useDispatch: () => jest.fn(),
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({ dogs: { request: mockRequest } }),
}));

beforeEach(() => {
  mockRequest = { loading: false, error: false, data: [] };
  mockOffline = false;
});

test("renders the share prompt once the deck is genuinely empty", () => {
  const html = renderToStaticMarkup(<SwipeRequestFeedback />);

  expect(html).toContain("share-prompt:empty_deck");
});

test("keeps the share prompt out of the tree while cards are still on the deck", () => {
  mockRequest = { loading: false, error: false, data: [{ id: "dog-1" }] };

  const html = renderToStaticMarkup(<SwipeRequestFeedback />);

  // The empty copy still renders, because the cards cover it. The prompt must
  // not: it fires `Share Prompt Shown` on mount, and a prompt nobody saw
  // counts against the empty deck funnel all the same.
  expect(html).toContain("swipeRequestFeedback.emptyTitle");
  expect(html).not.toContain("share-prompt");
});

test("keeps the share prompt out of the tree while the deck is loading", () => {
  mockRequest = { loading: true, error: false, data: [] };

  const html = renderToStaticMarkup(<SwipeRequestFeedback />);

  expect(html).not.toContain("share-prompt");
});
