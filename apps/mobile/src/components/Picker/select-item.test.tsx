import * as React from "react";

/**
 * The defect: a picker row is a Pressable wrapping a bare <Text>. Neither is
 * an accessibility element on its own, so on iOS 26 Fabric the row is absent
 * from the accessibility tree — VoiceOver skips it and
 * `tapOn: text: "Medium"` WARNs. Every flow works around it by tapping a
 * hard-coded point, and point taps are what made the tour type into the wrong
 * field twice (tour-ios/MANIFEST.md, "iOS driving notes").
 */

type CapturedProps = Record<string, unknown> & {
  children?: React.ReactNode;
  onPress?: () => void;
};

const captured: CapturedProps[] = [];

jest.mock<Record<string, unknown>>("./styles", () => ({
  SelectItem: (props: CapturedProps) => {
    captured.push(props);
    return null;
  },
  styles: {
    selectItem: {},
    useVariants: jest.fn(),
  },
}));

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

import { renderToStaticMarkup } from "react-dom/server";

import { PickerSelectItem } from "./select-item";

const MEDIUM = { id: "medium", name: "Medium" };
const LARGE = { id: "large", name: "Large" };

const renderRow = (value: typeof MEDIUM | undefined) => {
  captured.length = 0;
  renderToStaticMarkup(
    <PickerSelectItem
      item={MEDIUM}
      value={value}
      onChange={jest.fn()}
      onClose={jest.fn()}
      testID="size-medium"
    />,
  );

  return captured[0]!;
};

describe("a picker row", () => {
  it("is one accessibility element that announces its option", () => {
    const props = renderRow(undefined);

    // `accessible` is what collapses the Pressable and its Text into a
    // single element. Without it there is nothing in the tree to label.
    expect(props.accessible).toBe(true);
    expect(props.accessibilityRole).toBe("button");
    expect(props.accessibilityLabel).toBe("Medium");
  });

  it("reports the selection the highlight conveys visually", () => {
    expect(renderRow(MEDIUM).accessibilityState).toStrictEqual({
      selected: true,
    });
    expect(renderRow(LARGE).accessibilityState).toStrictEqual({
      selected: false,
    });
  });

  it("keeps the testID the flows select it by", () => {
    expect(renderRow(undefined).testID).toBe("size-medium");
  });
});
