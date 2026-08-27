import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SceneName } from "@/types/scene-name";

/**
 * NewMatch is a one-shot celebration interstitial: the swipe saga pushes it
 * the instant the API answers a like with `{ match }`, and every exit from it
 * is terminal. These tests pin its exits, because they were wrong in a way
 * that only ever showed up as a back-navigation dead end.
 *
 * Rendering goes through `react-dom/server`, matching the other tests in this
 * package: there is no React Native transform here, so every RN-flavoured
 * import is stubbed. The `Button` stub parks each `onPress` in `mockHandlers`
 * so a test can invoke a CTA without a real renderer or DOM events. Names are
 * `mock`-prefixed because jest hoists the factories above the declarations.
 */

const mockHandlers = new Map<string, () => Promise<void> | void>();
const mockBackHandlers: (() => boolean)[] = [];

const mockRouter = {
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  push: jest.fn(),
  replace: jest.fn(),
};

const mockSafeLoadAndShow = jest.fn(() => Promise.resolve());

jest.mock<Record<string, unknown>>("react-native", () => {
  const { createElement } = require("react") as typeof React;

  // Prop-dropping stubs rather than bare host strings: RN props like `testID`
  // and `contentContainerStyle` are not DOM attributes, and react-dom reports
  // each one through `console.error`.
  const hostElement = () =>
    function Stub({ children }: { children?: React.ReactNode }) {
      return createElement("div", null, children);
    };

  return {
    BackHandler: {
      addEventListener: (_event: string, handler: () => boolean) => {
        mockBackHandlers.push(handler);
        return { remove: () => undefined };
      },
    },
    ScrollView: hostElement(),
    View: hostElement(),
  };
});

jest.mock<Record<string, unknown>>("expo-router", () => ({
  // The real hook runs its effect when the screen gains focus. `useEffect`
  // never fires under `renderToStaticMarkup`, so the stub calls the effect
  // inline — a static render is exactly the "screen is focused" case.
  useFocusEffect: (effect: () => (() => void) | void) => {
    effect();
  },
  useLocalSearchParams: () => ({
    matchDogId: "dog-matchme",
    matchId: "match-42",
  }),
  useRouter: () => mockRouter,
}));

jest.mock<Record<string, unknown>>("expo-status-bar", () => ({
  StatusBar: () => null,
}));

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock<Record<string, unknown>>("react-native-unistyles", () => ({
  useUnistyles: () => ({ theme: { dark: false, spacing: {} } }),
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
      onPress: () => Promise<void> | void;
      testID: string;
    }) => {
      mockHandlers.set(testID, onPress);
      return createElement("button", { type: "button" }, children);
    },
  };
});

jest.mock<Record<string, unknown>>("@/components/NetworkBoundary", () => ({
  NetworkBoundary: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("@/contexts/trpc-provider", () => ({
  api: {
    dog: {
      get: {
        useSuspenseQuery: () => [{ id: "dog-matchme", name: "MatchMe" }],
      },
    },
  },
}));

jest.mock<Record<string, unknown>>(
  "@/services/advertisement/interstitial",
  () => ({
    useForAdRequestTracked: () => ({
      safeLoadAndShow: mockSafeLoadAndShow,
    }),
  }),
);

jest.mock<Record<string, unknown>>("@/services/analytics", () => ({
  analytics: { track: () => undefined },
}));

jest.mock<Record<string, unknown>>("@/services/haptics", () => ({
  haptics: { success: () => undefined },
}));

jest.mock<Record<string, unknown>>("./animated-cards", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock<Record<string, unknown>>("./confetti-animation", () => ({
  ConfettiAnimation: () => null,
}));

jest.mock<Record<string, unknown>>("./styles", () => ({
  Content: ({ children }: { children?: React.ReactNode }) => children,
  MatchCaption: ({ children }: { children?: React.ReactNode }) => children,
  MatchWordmark: () => null,
  styles: {},
}));

import NewMatchScreen from ".";

const render = () => {
  mockHandlers.clear();
  mockBackHandlers.length = 0;
  renderToStaticMarkup(<NewMatchScreen />);
};

describe("NewMatch exits", () => {
  it("swaps itself for the chat instead of stacking it on top", async () => {
    render();

    await mockHandlers.get("new-match-send")?.();

    // `push` leaves the spent celebration screen underneath the chat, so
    // backing out of the conversation lands on confetti for a match the user
    // already acknowledged, and a second back is needed to reach the deck.
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: `${SceneName.Chat}/[matchId]`,
      params: { dogId: "dog-matchme", matchId: "match-42" },
    });
  });

  it("shows the interstitial before leaving for the chat", async () => {
    render();

    await mockHandlers.get("new-match-send")?.();

    expect(mockSafeLoadAndShow).toHaveBeenCalled();
    expect(mockSafeLoadAndShow.mock.invocationCallOrder[0]!).toBeLessThan(
      mockRouter.replace.mock.invocationCallOrder[0]!,
    );
  });
});
