import * as React from "react";

/**
 * The defect: every option inside a picker sheet is invisible to the
 * accessibility tree, and so is the screen behind it.
 *
 * `@gorhom/bottom-sheet` applies `accessible` to the sheet's own container
 * view, and its default is `true` (`DEFAULT_ACCESSIBLE` in
 * components/bottomSheet/constants). On iOS, `accessible={true}` means "this
 * view IS the accessibility element" — UIKit stops descending, so the title,
 * the close button and every row underneath collapse into a single element
 * that announces "Bottom Sheet" and nothing else. VoiceOver cannot reach a
 * single option in the theme, language, size, colour or breed pickers.
 *
 * Captured from a live iPhone 17 Pro Max (iOS 26) with the colour sheet open
 * and fully painted — the whole app, sheet contents included, reduced to:
 *
 *   'Pegada'
 *     'Bottom sheet handle'
 *     'Bottom Sheet'
 *     'Bottom Sheet'
 *
 * This is also the truth behind the note that three Maestro flows carry —
 * 23-preferences-journey, 23b-lang-theme-persistence, 40, and REWRITE-PLAN.md
 * — that opening one of these sheets "crashes the XCUITest driver". Nothing
 * crashes. The sheet renders perfectly and hides its own contents, and
 * XCUITest reports what VoiceOver would get.
 */

type CapturedProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

const capturedModalProps: CapturedProps[] = [];

jest.mock<Record<string, unknown>>("@gorhom/bottom-sheet", () => ({
  BottomSheetModal: (props: CapturedProps) => {
    capturedModalProps.push(props);
    return null;
  },
  BottomSheetFlatList: () => null,
}));

// `react-native` ships untransformed Flow, and nothing here needs it to be
// real — the assertion is about the props this component hands the sheet.
jest.mock<Record<string, unknown>>("react-native", () => ({
  BackHandler: { addEventListener: () => ({ remove: () => undefined }) },
  Keyboard: { dismiss: () => undefined },
  Pressable: ({ children }: { children?: React.ReactNode }) => children,
  View: ({ children }: { children?: React.ReactNode }) => children,
  useWindowDimensions: () => ({ width: 440, height: 956 }),
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

jest.mock<Record<string, unknown>>("@/components/custom-backdrop", () => ({
  renderCustomBackdrop: () => null,
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

// The sheet reads a handful of theme tokens purely to build style objects it
// never asserts on. A recursive stand-in answers any token path so the test
// does not have to track the design system. Built inside the factory because
// jest.mock may not close over anything but `mock`-prefixed names.
jest.mock<Record<string, unknown>>("react-native-unistyles", () => {
  const anyToken: unknown = new Proxy({}, { get: () => anyToken });

  return { useUnistyles: () => ({ theme: anyToken }) };
});

import { renderToStaticMarkup } from "react-dom/server";

import { PickerSheet } from "./index";

const OPTIONS = [
  { id: "BLACK", name: "Black" },
  { id: "GOLDEN", name: "Golden" },
];

const renderSheet = () => {
  capturedModalProps.length = 0;

  renderToStaticMarkup(
    <PickerSheet
      title="Color"
      placeholder="Any color"
      value={undefined}
      data={OPTIONS}
      onChange={jest.fn()}
      itemTestIDPrefix="preferences-color-item-"
    />,
  );

  return capturedModalProps[0]!;
};

describe("a picker sheet", () => {
  it("does not collapse its contents into a single accessibility element", () => {
    const props = renderSheet();

    // The whole fix. `false` is not the same as leaving it unset: the library
    // substitutes its own `true` for `undefined`, so the prop has to be
    // passed explicitly to turn the behaviour off.
    expect(props.accessible).toBe(false);
  });

  it("still renders its options underneath", () => {
    const props = renderSheet();

    // Guards the obvious over-correction — dropping the container's
    // accessibility by removing the subtree instead of by exposing it.
    expect(props.children).toBeTruthy();
  });
});
