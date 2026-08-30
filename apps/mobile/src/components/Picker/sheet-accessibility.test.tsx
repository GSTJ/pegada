import * as React from "react";

/**
 * The defect this guards: every option inside a picker sheet must stay
 * reachable by VoiceOver — nothing in the sheet's own tree may set
 * `accessible={true}` on a container, because that collapses everything
 * beneath it (title, close button, every row) into one announcement.
 *
 * That used to happen for free: `@gorhom/bottom-sheet`'s `BottomSheetModal`
 * defaulted its container to `accessible={true}` (`DEFAULT_ACCESSIBLE`), and
 * the original fix passed `accessible={false}` explicitly to opt out.
 *
 * The picker has since migrated onto `react-native-magic-modal`
 * (Picker/index.tsx) — gorhom is gone, and magic-modal's own wrapper views
 * never set `accessible` at all, so that specific default no longer exists.
 * What remains worth guarding is the sheet's OWN render tree: nothing in it
 * should reintroduce the same collapse by adding `accessible={true}` to one
 * of its containers.
 */

type CapturedProps = Record<string, unknown> & {
  children?: React.ReactNode;
  accessible?: unknown;
  style?: unknown;
};

const capturedElements: {
  tag: string;
  accessible: unknown;
  style?: unknown;
}[] = [];
const capturedFlatListProps: CapturedProps[] = [];

jest.mock<Record<string, unknown>>("react-native", () => ({
  FlatList: (props: CapturedProps) => {
    capturedFlatListProps.push(props);
    return null;
  },
  Platform: { OS: "ios" },
  Pressable: ({ children, accessible, style }: CapturedProps) => {
    capturedElements.push({ tag: "Pressable", accessible, style });
    return children ?? null;
  },
  useWindowDimensions: () => ({ width: 440, height: 956 }),
  View: ({ children, accessible, style }: CapturedProps) => {
    capturedElements.push({ tag: "View", accessible, style });
    return children ?? null;
  },
}));

jest.mock<Record<string, unknown>>("react-native-gesture-handler", () => {
  const gesture = { onUpdate: () => gesture, onEnd: () => gesture };

  return {
    Gesture: { Pan: () => gesture },
    GestureDetector: ({ children }: CapturedProps) => children ?? null,
  };
});

jest.mock<Record<string, unknown>>("react-native-reanimated", () => {
  const chainable = { duration: () => chainable, easing: () => chainable };

  return {
    __esModule: true,
    default: {
      View: ({ children, accessible, style }: CapturedProps) => {
        capturedElements.push({ tag: "Animated.View", accessible, style });
        return children ?? null;
      },
      createAnimatedComponent: (Component: unknown) => Component,
    },
    Easing: { bezier: () => (t: number) => t },
    FadeInDown: chainable,
    FadeOutDown: chainable,
    runOnJS: (fn: unknown) => fn,
    useAnimatedStyle: () => ({}),
    useSharedValue: (initial: unknown) => ({ value: initial }),
    withSpring: (value: unknown) => value,
    withTiming: (value: unknown) => value,
  };
});

jest.mock<Record<string, unknown>>("react-native-magic-modal", () => ({
  useMagicModal: () => ({ hide: jest.fn() }),
}));

jest.mock<Record<string, unknown>>("./styles", () => ({
  CloseIcon: () => null,
  SearchInput: () => null,
  styles: new Proxy(
    {},
    {
      get: (_target, key) => (key === "useVariants" ? () => undefined : {}),
    },
  ),
}));

jest.mock<Record<string, unknown>>("./select-item", () => ({
  PickerSelectItem: () => null,
}));

jest.mock<Record<string, unknown>>("@/components/Input", () => ({
  Input: () => null,
}));

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock<Record<string, unknown>>("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock<Record<string, unknown>>("@/hooks/use-disable-swipe-back", () => ({
  useDisableSwipeBack: () => jest.fn(),
}));

jest.mock<Record<string, unknown>>("@/hooks/use-keyboard-aware-scroll", () => ({
  useKeyboardOverlap: () => 300,
}));

// The sheet reads a handful of theme tokens purely to build style objects it
// never asserts on. A recursive stand-in answers any token path so the test
// does not have to track the design system. Built inside the factory because
// jest.mock may not close over anything but `mock`-prefixed names.
jest.mock<Record<string, unknown>>("react-native-unistyles", () => {
  const anyToken: unknown = new Proxy({}, { get: () => anyToken });

  return { useUnistyles: () => ({ theme: anyToken }) };
});

import { renderToStaticMarkup } from "react-dom/server";

import { PickerSheetContent } from "./index";

const OPTIONS = [
  { id: "BLACK", name: "Black" },
  { id: "GOLDEN", name: "Golden" },
];

const renderSheet = () => {
  capturedElements.length = 0;
  capturedFlatListProps.length = 0;

  renderToStaticMarkup(
    <PickerSheetContent
      title="Color"
      placeholder="Any color"
      value={undefined}
      data={OPTIONS}
      onChange={jest.fn()}
      itemTestIDPrefix="preferences-color-item-"
    />,
  );
};

describe("a picker sheet", () => {
  it("does not collapse its contents into a single accessibility element", () => {
    renderSheet();

    const collapsed = capturedElements.filter((el) => el.accessible === true);
    expect(collapsed).toStrictEqual([]);
  });

  it("still renders its options underneath", () => {
    renderSheet();

    expect(capturedFlatListProps[0]?.data).toStrictEqual(OPTIONS);
  });

  it("keeps the sheet above the keyboard", () => {
    renderSheet();

    const sheet = capturedElements.find((el) => el.tag === "Animated.View");
    const style = sheet?.style as unknown[];

    expect(style).toContainEqual({ maxHeight: 656 });
  });
});
