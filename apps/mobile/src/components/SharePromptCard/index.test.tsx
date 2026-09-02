import type { ShareableDog } from "@/components/DogShareOptions/types";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { showDogShareOptions } from "@/components/DogShareOptions";

import { SharePromptCard } from "./index";
import { trackSharePromptTapped, useSharePromptShown } from "./tracking";

/**
 * The card is the top of the share funnel, so what is pinned here is the
 * instrumentation and the handoff: `Share Prompt Shown` for the placement and
 * dog it rendered for, `Share Prompt Tapped` before anything opens, and the
 * placement travelling through to the share sheet as its `source`. Break any
 * of those and the PostHog funnel silently stops joining up.
 *
 * Rendering goes through `react-dom/server`, matching the other suites here:
 * there is no React Native renderer in this package, so every RN-flavoured
 * import is stubbed and `Button` parks its `onPress` where a test can reach
 * it. Names are `mock`-prefixed because jest hoists the factories.
 */
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

let mockDogData: ShareableDog | undefined = mockDog;

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

jest.mock<Record<string, unknown>>("./styles", () => ({
  styles: { card: {}, title: {}, subtitle: {} },
}));

jest.mock<Record<string, unknown>>("./tracking", () => ({
  trackSharePromptTapped: jest.fn(),
  useSharePromptShown: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/contexts/trpc-provider", () => ({
  api: { myDog: { get: { useQuery: () => ({ data: mockDogData }) } } },
}));

jest.mock<Record<string, unknown>>("@/components/DogShareOptions", () => ({
  showDogShareOptions: jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/components/FakeDoor", () => ({
  FakeDoorRow: ({ testID }: { testID?: string }) => {
    const { createElement } = require("react") as typeof React;
    return createElement("div", { "data-testid": testID });
  },
}));

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

jest.mock<Record<string, unknown>>("@/components/text", () => {
  const { createElement } = require("react") as typeof React;

  return {
    Text: ({ children }: { children?: React.ReactNode }) =>
      createElement("span", null, children),
  };
});

jest.mock<Record<string, unknown>>("@/components/pressable-area", () => {
  const { createElement } = require("react") as typeof React;

  return {
    PressableArea: ({ children }: { children?: React.ReactNode }) =>
      createElement("div", null, children),
  };
});

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}|${options.name}` : key,
  }),
}));

jest.mock<Record<string, unknown>>("react-native-magic-modal", () => ({
  magicModal: { show: jest.fn() },
  useMagicModal: () => ({ hide: jest.fn() }),
}));

jest.mock<Record<string, unknown>>("react-native-reanimated", () => ({
  FadeInDown: { duration: () => ({}) },
  FadeOutDown: { duration: () => ({}) },
}));

jest.mock<Record<string, unknown>>("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

const mockShowDogShareOptions = jest.mocked(showDogShareOptions);
const mockTrackTapped = jest.mocked(trackSharePromptTapped);
const mockUseShown = jest.mocked(useSharePromptShown);

beforeEach(() => {
  mockHandlers.clear();
  mockDogData = mockDog;
});

test("reports the prompt as shown for its placement and dog", () => {
  renderToStaticMarkup(<SharePromptCard placement="empty_deck" />);

  expect(mockUseShown).toHaveBeenCalledWith("empty_deck", "dog-1");
});

test("tracks the tap before the share sheet opens, and carries the placement into it", () => {
  renderToStaticMarkup(<SharePromptCard placement="empty_deck" />);

  mockHandlers.get("share-prompt-button")?.();

  expect(mockTrackTapped).toHaveBeenCalledWith("empty_deck", "dog-1");
  expect(mockShowDogShareOptions).toHaveBeenCalledWith(mockDog, "empty_deck");
});

// The first-match placement lives in a modal that has to close before the
// share sheet opens, so it takes the dog instead of opening anything itself.
test("hands the dog to onShare instead of opening the sheet", () => {
  const onShare = jest.fn();

  renderToStaticMarkup(
    <SharePromptCard placement="first_match" onShare={onShare} />,
  );

  mockHandlers.get("share-prompt-button")?.();

  expect(mockTrackTapped).toHaveBeenCalledWith("first_match", "dog-1");
  expect(onShare).toHaveBeenCalledWith(mockDog);
  expect(mockShowDogShareOptions).not.toHaveBeenCalled();
});

// Only the empty deck has room for a second ask under the button.
test("only offers the invite fake door on the empty deck", () => {
  const emptyDeck = renderToStaticMarkup(
    <SharePromptCard placement="empty_deck" />,
  );
  const firstMatch = renderToStaticMarkup(
    <SharePromptCard placement="first_match" />,
  );

  expect(emptyDeck).toContain("fake-door-referral");
  expect(firstMatch).not.toContain("fake-door-referral");
});

test("renders nothing, and reports nothing shown, until the dog loads", () => {
  mockDogData = undefined;

  expect(renderToStaticMarkup(<SharePromptCard placement="empty_deck" />)).toBe(
    "",
  );
  expect(mockUseShown).toHaveBeenCalledWith("empty_deck", undefined);
});

test("uses the feminine copy for a female dog", () => {
  mockDogData = { ...mockDog, gender: "FEMALE", name: "Bella" };

  const markup = renderToStaticMarkup(
    <SharePromptCard placement="empty_deck" />,
  );

  expect(markup).toContain("sharePrompt.titleFemale|Bella");
  expect(markup).toContain("sharePrompt.subtitleFemale|Bella");
});

// The card addresses the dog by name, and a two-word name in a headline is
// the owner's, not the dog's.
test("addresses the dog by its first name", () => {
  const markup = renderToStaticMarkup(
    <SharePromptCard placement="empty_deck" />,
  );

  expect(markup).toContain("sharePrompt.titleMale|Rex");
});
