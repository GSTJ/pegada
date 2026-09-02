import type { ShareableDog } from "@/components/DogShareOptions/types";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { router } from "expo-router";

import enTranslation from "@pegada/shared/i18n/locales/en/translation.json";
import ptBrTranslation from "@pegada/shared/i18n/locales/pt-BR/translation.json";

import { showDogShareOptions } from "@/components/DogShareOptions";
import {
  trackSharePromptTapped,
  useSharePromptShown,
} from "@/components/SharePromptCard/tracking";
import { analytics } from "@/services/analytics";
import { storeData } from "@/services/storage";

import SwipeRequestFeedback from "./index";

/**
 * This screen renders behind the deck on every visit to the swipe tab, not
 * only when the deck runs out — the cards are stacked on top of it in
 * `views/(tabs)/Swipe/index.tsx`. Two things are pinned here: the whole
 * empty state is in the tree only when the deck is genuinely empty, and the
 * screen offers exactly one action plus one way out.
 *
 * The share ask reuses the share prompt's funnel (`Share Prompt Shown` /
 * `Share Prompt Tapped` with the `empty_deck` placement) rather than opening
 * a second one, so the readout joins straight to `Share Completed`.
 *
 * Rendering goes through `react-dom/server`, matching the other suites in
 * this package: there is no React Native renderer here, so the RN-flavoured
 * imports are stubbed and the two pressables park their handlers where a
 * test can reach them. Effects do not run under server rendering, so
 * `Share Prompt Shown` is asserted through the hook call the card's own
 * suite uses. Names are `mock`-prefixed because jest hoists the factories.
 */

type RequestState = {
  loading: boolean;
  error: boolean;
  data: { id: string }[];
};

const mockHandlers = new Map<string, () => void>();

const mockDog: ShareableDog = {
  id: "dog-1",
  name: "Rex do Campo",
  bio: null,
  birthDate: null,
  breed: null,
  gender: "MALE",
  images: [],
};

let mockRequest: RequestState = { loading: false, error: false, data: [] };
let mockLastCardId: string | undefined;
let mockOffline = false;
let mockDogData: ShareableDog | undefined = mockDog;

jest.mock<Record<string, unknown>>("@/contexts/trpc-provider", () => ({
  api: { myDog: { get: { useQuery: () => ({ data: mockDogData }) } } },
}));

// Prop-dropping stub rather than a bare host string: RN props like `testID`
// are not DOM attributes, and react-dom reports each one through
// `console.error`.
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
      scroll: {},
      emptyAnimation: {},
      logoLoading: {},
      column: {},
      illustration: {},
      title: {},
      description: {},
      preferencesLink: {},
      preferencesLinkLabel: {},
    },
    Container: passthrough("div"),
    EmptyAnimation: passthrough("div"),
    LogoLoading: passthrough("div"),
    Title: passthrough("span"),
    Description: passthrough("span"),
    LinkLabel: passthrough("span"),
    LinkPressable: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress: () => void;
      testID: string;
    }) => {
      mockHandlers.set(testID, onPress);
      return createElement("div", null, children);
    },
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
    Button: ({
      children,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      onPress: () => void;
      testID: string;
    }) => {
      mockHandlers.set(testID, onPress);
      return createElement("button", { type: "button" }, children);
    },
  };
});

jest.mock<Record<string, unknown>>("@/components/DogShareOptions", () => ({
  showDogShareOptions: jest.fn(),
}));

jest.mock<Record<string, unknown>>(
  "@/components/SharePromptCard/tracking",
  () => ({
    trackSharePromptTapped: jest.fn(),
    useSharePromptShown: jest.fn(),
  }),
);

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: jest.fn() },
}));

// The opt-in this screen used to write is gone; the mock stays so the test
// below can prove nothing reaches for it any more.
jest.mock<Record<string, unknown>>("@/services/storage", () => ({
  StorageKeys: {},
  getData: jest.fn(),
  storeData: jest.fn(),
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
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}|${options.name}` : key,
  }),
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

const mockShowDogShareOptions = jest.mocked(showDogShareOptions);
const mockTrackTapped = jest.mocked(trackSharePromptTapped);
const mockUseShown = jest.mocked(useSharePromptShown);
const mockTrack = jest.mocked(analytics.track);
const mockStoreData = jest.mocked(storeData);
const mockRouterPush = jest.mocked(router.push);

beforeEach(() => {
  mockHandlers.clear();
  mockRequest = { loading: false, error: false, data: [] };
  mockLastCardId = undefined;
  mockOffline = false;
  mockDogData = mockDog;
});

test("says one thing and offers one action and one way out", () => {
  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  expect(html).toContain("swipeRequestFeedback.emptyTitle");
  expect(html).toContain("swipeRequestFeedback.emptyDescription");
  expect(html).toContain("swipeRequestFeedback.preferencesLink");
  expect(mockHandlers.has("empty-deck-share")).toBe(true);
  expect(mockHandlers.has("empty-deck-preferences")).toBe(true);
});

// Four competing calls to action was the problem this screen had. The invite
// fake door lives in the share sheet, and the new-dogs alert is the
// re-engagement cron's job, so neither is a control here any more.
test("drops the invite and notify controls", () => {
  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  expect(html).not.toContain("inviteFriend");
  expect(html).not.toContain("notifyNewDogs");
  expect(html).not.toContain("share-prompt-card");
  expect(mockStoreData).not.toHaveBeenCalled();
});

test("names the dog on the share button", () => {
  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  // A two-word name in a button label is the owner's, not the dog's.
  expect(html).toContain("swipeRequestFeedback.shareButtonMale|Rex");
});

test("uses the feminine article for a female dog", () => {
  mockDogData = { ...mockDog, gender: "FEMALE", name: "Bella" };

  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  expect(html).toContain("swipeRequestFeedback.shareButtonFemale|Bella");
});

test("reports the share ask as shown for this placement and dog", () => {
  renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  expect(mockUseShown).toHaveBeenCalledWith("empty_deck", "dog-1");
});

test("tracks the share tap once and opens the sheet for this placement", () => {
  renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  mockHandlers.get("empty-deck-share")?.();

  expect(mockTrackTapped).toHaveBeenCalledWith("empty_deck", "dog-1");
  expect(mockShowDogShareOptions).toHaveBeenCalledWith(mockDog, "empty_deck");
  // An `Empty Deck Action Tapped` alongside the share funnel's own event
  // would count the same tap twice in the readout.
  expect(mockTrack).not.toHaveBeenCalled();
});

test("counts the preferences link and navigates to preferences", () => {
  renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  mockHandlers.get("empty-deck-preferences")?.();

  expect(mockTrack).toHaveBeenCalledWith({
    event_type: "Empty Deck Action Tapped",
    event_properties: { action: "preferences" },
  });
  expect(mockRouterPush).toHaveBeenCalledWith("/preferences");
});

// The label names the dog, so there is nothing to render before it arrives.
test("holds the share button back until the dog is known", () => {
  mockDogData = undefined;

  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  expect(html).toContain("swipeRequestFeedback.emptyTitle");
  expect(mockHandlers.has("empty-deck-share")).toBe(false);
  expect(mockUseShown).toHaveBeenCalledWith("empty_deck", undefined);
});

test("renders nothing at all while cards are still on the deck", () => {
  mockRequest = { loading: false, error: false, data: [{ id: "dog-1" }] };

  const html = renderToStaticMarkup(
    <SwipeRequestFeedback deckIsEmpty={false} />,
  );

  // The whole empty state stays out of the tree behind a full deck, which is
  // what keeps `Share Prompt Shown` off a prompt nobody saw.
  expect(html).not.toContain("swipeRequestFeedback.emptyTitle");
  expect(mockUseShown).not.toHaveBeenCalled();
});

test("keeps the share ask out of the tree while the deck is loading", () => {
  mockRequest = { loading: true, error: false, data: [] };

  const html = renderToStaticMarkup(<SwipeRequestFeedback deckIsEmpty />);

  expect(html).not.toContain("swipeRequestFeedback.emptyTitle");
  expect(mockUseShown).not.toHaveBeenCalled();
});

// The screen is one line of copy and one button. Emoji in either read as
// filler next to a single clear ask, and they are what the copy leaned on
// when it had four things to say.
test.each([
  ["pt-BR", ptBrTranslation],
  ["en", enTranslation],
])("keeps %s copy free of emoji", (_locale, translation) => {
  const copy = Object.values(translation.swipeRequestFeedback).join(" ");

  expect(copy).not.toMatch(/\p{Extended_Pictographic}/u);
});
