import * as React from "react";

/**
 * The defect: the gender radio was the one required control on CreateProfile
 * that nothing could address. `RadioButtons` rendered a Pressable per option
 * and passed it no `testID`, and its options were identified by their
 * TRANSLATED label — so a flow could only reach "Female" by matching display
 * copy, in whatever language the device happened to boot in.
 *
 * That is why no E2E flow has ever created a FEMALE dog, and why the deck's
 * opposite-gender filter (SuggestionService.#buildPreferenceConditions) has
 * never been exercised with two accounts created through the app.
 */

type CapturedProps = Record<string, unknown> & {
  children?: React.ReactNode;
  onPress?: () => void;
};

const captured: CapturedProps[] = [];

jest.mock<Record<string, unknown>>("./styles", () => ({
  RadioButtonContainer: (props: CapturedProps) => {
    captured.push(props);
    return null;
  },
  TextButton: ({ children }: { children?: React.ReactNode }) => children,
  // `useVariants` has to RETURN the stylesheet. The unistyles babel plugin
  // rewrites `styles.useVariants({...}); ... style={styles.x}` into
  // `const s = styles.useVariants({...}); ... style={s.x}`, so a mock that
  // returns undefined makes every render throw on `undefined.x`. Same trap
  // select-item.test.tsx was caught in.
  styles: {
    content: {},
    radioButtonContainer: {},
    textButton: {},
    useVariants: jest.fn(() => ({
      content: {},
      radioButtonContainer: {},
      textButton: {},
    })),
  },
}));

jest.mock<Record<string, unknown>>("@/components/Input/styles", () => ({
  styles: { container: {} },
}));

// react-native ships untranspiled Flow; this suite has no RN preset and only
// needs `View` to be a passthrough so the option props can be captured.
jest.mock<Record<string, unknown>>("react-native", () => ({
  View: ({ children }: { children?: React.ReactNode }) => children,
}));

// ...and the mock above never reached this component, which is the other half
// of why this suite has never run. The unistyles babel plugin rewrites the
// `View` import out of `react-native` and into its own drop-in:
//
//   var _View = require("react-native-unistyles/components/native/View");
//
// so the real one rendered, took its web `getClassname` path under jsdom-less
// Node, and died on `unistyle.ts` reading `.Node` of undefined. Mocking the
// module the plugin actually emits is the only mock that applies.
jest.mock<Record<string, unknown>>(
  "react-native-unistyles/components/native/View",
  () => ({
    View: ({ children }: { children?: React.ReactNode }) => children,
  }),
);

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

import { renderToStaticMarkup } from "react-dom/server";

import { RadioButtons } from ".";

const GENDERS = [
  { id: "MALE", name: "Macho" },
  { id: "FEMALE", name: "Fêmea" },
];

const renderRadios = ({
  value = "MALE",
  onChange = jest.fn(),
}: { value?: string; onChange?: (id: string) => void } = {}) => {
  captured.length = 0;
  renderToStaticMarkup(
    <RadioButtons
      title="Gender"
      data={GENDERS}
      value={value}
      onChange={onChange}
      itemTestIDPrefix="gender-item-"
    />,
  );

  return captured;
};

describe("a radio group", () => {
  it("gives every option a testID derived from its stable id", () => {
    const options = renderRadios();

    expect(options.map((option) => option.testID)).toStrictEqual([
      "gender-item-MALE",
      "gender-item-FEMALE",
    ]);
  });

  it("reports the selection back as the id, not the translated label", () => {
    const onChange = jest.fn();
    const options = renderRadios({ onChange });

    (options[1]!.onPress as () => void)();

    expect(onChange).toHaveBeenCalledWith("FEMALE");
  });

  it("reports the selection the highlight conveys visually", () => {
    const options = renderRadios({ value: "FEMALE" });

    expect(options.map((option) => option.accessibilityState)).toStrictEqual([
      { selected: false },
      { selected: true },
    ]);
    expect(options.map((option) => option.accessibilityRole)).toStrictEqual([
      "radio",
      "radio",
    ]);
  });

  it("adds no testID when the caller asks for none", () => {
    captured.length = 0;
    renderToStaticMarkup(
      <RadioButtons
        title="Gender"
        data={GENDERS}
        value="MALE"
        onChange={jest.fn()}
      />,
    );

    expect(captured.every((option) => option.testID === undefined)).toBe(true);
  });
});
