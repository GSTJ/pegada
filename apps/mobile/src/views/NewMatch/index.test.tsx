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
const mockEffects: (() => (() => void) | void)[] = [];

jest.mock<Record<string, unknown>>("react", () => {
  const actual = jest.requireActual<typeof React>("react");

  return {
    ...actual,
    // A static render never runs effects, and the review ask lives in one.
    // Collected here and run by `render` instead, which is what lets a test
    // watch the timer that ask is scheduled on.
    useEffect: (effect: () => (() => void) | void) => {
      mockEffects.push(effect);
    },
  };
});

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
    // Feeds the review trigger its match count. The screen reads it as a
    // plain query so a slow answer cannot hold up the celebration.
    match: {
      getAll: {
        useQuery: () => ({ data: [{ id: "match-42" }] }),
      },
    },
  },
}));

// What the ask decides once it is made is covered in
// `services/app-review-policy.test.ts` and `services/app-review.test.tsx`.
// This stub is about whether the screen makes it at all.
type ReviewAskOptions = {
  trigger: string;
  matchCount?: number;
  canStillAsk?: () => boolean;
};

// Resolves whether the modal went up, which is what decides if the share
// prompt gets the moment instead. Defaults to "did not ask".
const mockHandleRequestAppReview = jest.fn<
  Promise<boolean>,
  [ReviewAskOptions]
>(() => Promise.resolve(false));

jest.mock<Record<string, unknown>>("@/services/app-review", () => ({
  handleRequestAppReview: (options: ReviewAskOptions) =>
    mockHandleRequestAppReview(options),
}));

const mockShowSharePrompt = jest.fn();

const mockRunMatchSharePrompt = jest.fn((show: () => void) => {
  show();
  return Promise.resolve(true);
});

jest.mock<Record<string, unknown>>("@/components/SharePromptCard", () => ({
  showSharePromptModal: () => mockShowSharePrompt(),
}));

jest.mock<Record<string, unknown>>(
  "@/components/SharePromptCard/match-gate",
  () => ({
    runMatchSharePrompt: (show: () => void) => mockRunMatchSharePrompt(show),
  }),
);

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: () => undefined,
}));

jest.mock<Record<string, unknown>>("@/services/e2e", () => ({
  isMaestroE2EBuild: () => false,
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

import NewMatchScreen, { REVIEW_PROMPT_DELAY_MS } from ".";

const render = () => {
  mockHandlers.clear();
  mockBackHandlers.length = 0;
  mockEffects.length = 0;

  renderToStaticMarkup(<NewMatchScreen />);

  return mockEffects.map((effect) => effect());
};

beforeEach(() => {
  jest.useFakeTimers();
  mockHandleRequestAppReview.mockResolvedValue(false);
});

afterEach(() => {
  jest.useRealTimers();
});

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

  it("pops exactly once when Android's back button is the skip", async () => {
    render();

    // Returning false hands the press on to the navigator, which pops by
    // itself — on top of the `router.back()` the skip handler queues once the
    // interstitial closes. One press, two pops, and the second one lands on
    // whatever was under the tab the user was on.
    expect(mockBackHandlers[0]?.()).toBe(true);

    // The pop is deferred behind `await safeLoadAndShow()`, so it lands a
    // microtask later than the handler returns.
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});

describe("the first match review ask", () => {
  it("waits out the confetti before asking", () => {
    render();

    jest.advanceTimersByTime(REVIEW_PROMPT_DELAY_MS - 1);
    expect(mockHandleRequestAppReview).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(mockHandleRequestAppReview).toHaveBeenCalledWith(
      expect.objectContaining({ matchCount: 1, trigger: "first_match" }),
    );
  });

  it.each(["new-match-send", "new-match-skip"])(
    "drops the ask the instant %s is pressed",
    (testID) => {
      render();

      // Deliberately not awaited. Both CTAs wait on the interstitial before
      // they navigate, so the screen stays mounted for seconds after the
      // press and the timer would otherwise still be running under a full
      // screen ad, where the prompt is invisible and in the way of closing
      // it. The cancel has to land in the press itself, before any await.
      void mockHandlers.get(testID)?.();

      jest.advanceTimersByTime(REVIEW_PROMPT_DELAY_MS * 4);

      expect(mockHandleRequestAppReview).not.toHaveBeenCalled();
    },
  );

  it("leaves the second message fallback armed when a CTA cancels it", async () => {
    render();

    const pressed = mockHandlers.get("new-match-send")?.();
    jest.advanceTimersByTime(REVIEW_PROMPT_DELAY_MS * 4);
    await pressed;

    // The marker that switches the fallback off is written by the ask, and
    // only once the prompt is on screen. No ask, no marker, so the second
    // message still gets to try.
    expect(mockHandleRequestAppReview).not.toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalled();
  });

  it("withdraws an ask that is already in flight", () => {
    render();

    jest.advanceTimersByTime(REVIEW_PROMPT_DELAY_MS);

    // The ask reads storage and calls the API before it shows anything, so a
    // press can land while it is still deciding.
    const options = mockHandleRequestAppReview.mock.calls[0]?.[0];
    expect(options?.canStillAsk?.()).toBe(true);

    void mockHandlers.get("new-match-skip")?.();

    expect(options?.canStillAsk?.()).toBe(false);
  });

  it("stops the timer when the screen goes away", () => {
    const cleanups = render();

    for (const cleanup of cleanups) cleanup?.();

    jest.advanceTimersByTime(REVIEW_PROMPT_DELAY_MS * 4);

    expect(mockHandleRequestAppReview).not.toHaveBeenCalled();
  });
});

/**
 * The share prompt is a one-shot ask, and the gate that makes it one lives in
 * storage. What this screen owns is asking it on BOTH exits, only after the
 * celebration is gone, and only on the matches the review ask leaves alone.
 */
describe("the match share prompt", () => {
  it("asks the gate after leaving for the chat", async () => {
    render();

    await mockHandlers.get("new-match-send")?.();

    expect(mockShowSharePrompt).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace.mock.invocationCallOrder[0]!).toBeLessThan(
      mockShowSharePrompt.mock.invocationCallOrder[0]!,
    );
  });

  it("asks the gate after skipping too", async () => {
    render();

    await mockHandlers.get("new-match-skip")?.();

    expect(mockRunMatchSharePrompt).toHaveBeenCalledTimes(1);
    expect(mockShowSharePrompt).toHaveBeenCalledTimes(1);
    expect(mockRouter.back.mock.invocationCallOrder[0]!).toBeLessThan(
      mockShowSharePrompt.mock.invocationCallOrder[0]!,
    );
  });

  // The whole point of handing the moment to one prompt at a time: a user who
  // just answered the review must not be asked to share on the way out.
  it("stays quiet on a match where the review ask went up", async () => {
    mockHandleRequestAppReview.mockResolvedValue(true);

    const cleanups = render();

    jest.advanceTimersByTime(REVIEW_PROMPT_DELAY_MS);
    // Lets the review promise settle so the screen records that it asked.
    await Promise.resolve();
    await Promise.resolve();

    await mockHandlers.get("new-match-skip")?.();

    expect(mockRunMatchSharePrompt).not.toHaveBeenCalled();
    expect(mockShowSharePrompt).not.toHaveBeenCalled();

    cleanups.forEach((cleanup) => cleanup?.());
  });
});
