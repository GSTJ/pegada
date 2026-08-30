import * as React from "react";

/**
 * The defect: every control in a photo cell is a Pressable holding nothing
 * but an SVG. None of them declares `accessible` or carries a label, so
 * VoiceOver reads the photo grid as a blank region — and on iOS that is also
 * why maestro's XCUITest driver could not see `add-photo-N` or the skip pill,
 * leaving `add-photo-button-N` as the only reachable node in a cell
 * (.unistyles-migration/baseline-report.md, "What changed to get here").
 */

type CapturedProps = Record<string, unknown> & { children?: React.ReactNode };

const captured: CapturedProps[] = [];

const capture = (props: CapturedProps) => {
  captured.push(props);
  return null;
};

jest.mock<Record<string, unknown>>("react-native", () => ({
  ActivityIndicator: () => null,
  View: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { replace?: { position?: number | string } }) =>
      `${key}:${options?.replace?.position ?? ""}`,
  }),
}));

jest.mock<Record<string, unknown>>("react-native-magic-toast", () => ({
  magicToast: { error: () => undefined },
}));

jest.mock<Record<string, unknown>>("react-native-reanimated", () => ({
  __esModule: true,
  default: { View: ({ children }: { children?: React.ReactNode }) => children },
  FadeOut: { duration: () => ({}) },
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: unknown) => ({ value }),
  withSpring: (value: unknown) => value,
}));

jest.mock<Record<string, unknown>>("react-native-unistyles", () => ({
  useUnistyles: () => ({
    theme: { colors: { text: "#000", primary: "#f0f" } },
  }),
}));

jest.mock<Record<string, unknown>>("@/assets/images/AddRemove.svg", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock<Record<string, unknown>>("@/components/pressable-area", () => ({
  PressableArea: (props: CapturedProps) => capture(props),
}));

jest.mock<Record<string, unknown>>(
  "@/components/ProfileImageUploader/utils",
  () => ({
    ImagePickerError: {},
    getMaestroPlaceholderUri: async () => "",
    shouldOfferMaestroPlaceholder: () => false,
    showImagePickerOptions: async () => undefined,
    uploadProfileImage: async () => "",
  }),
);

jest.mock<Record<string, unknown>>("@/components/text", () => ({
  Text: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: () => undefined,
}));

jest.mock<Record<string, unknown>>("./styles", () => ({
  AddRemoveContainer: (props: CapturedProps) => capture(props),
  FadedDog: () => null,
  MaestroSkipPressable: (props: CapturedProps) => capture(props),
  // `useVariants` has to RETURN the stylesheet: the unistyles babel plugin
  // rewrites `styles.useVariants({...}); ... style={styles.x}` into
  // `const s = styles.useVariants({...}); ... style={s.x}`, so a mock that
  // returns undefined makes every render throw on `undefined.x`.
  styles: {
    useVariants: jest.fn(() => ({
      addRemoveContainer: {},
      animatedOverlay: {},
      debugImageStatusContainer: {},
      fadedDog: {},
      maestroSkipPressable: {},
      userPicture: {},
      userPictureContainer: {},
      userPictureContent: {},
    })),
  },
  UserPicture: () => null,
}));

import { renderToStaticMarkup } from "react-dom/server";

import { AddUserPhoto } from ".";

const EMPTY_SLOT = {
  id: "image-id-0",
  key: "image-key-0",
  url: "",
  position: 0,
  disabledDrag: true,
  disabledReSorted: true,
};

const controlsFor = (url: string) => {
  captured.length = 0;
  renderToStaticMarkup(
    <AddUserPhoto
      picture={{ ...EMPTY_SLOT, url }}
      index={0}
      onAdd={jest.fn()}
      onDelete={jest.fn()}
    />,
  );

  return captured;
};

const byTestID = (controls: CapturedProps[], testID: string) =>
  controls.find((control) => control.testID === testID);

describe("a photo cell", () => {
  it("labels the empty slot's add area", () => {
    const control = byTestID(controlsFor(""), "add-photo-0");

    expect(control?.accessible).toBe(true);
    expect(control?.accessibilityRole).toBe("button");
    // 1-based, so the first slot reads "photo 1".
    expect(control?.accessibilityLabel).toBe("profilePhotos.addPhoto:1");
  });

  it("labels the corner button for what it currently does", () => {
    expect(
      byTestID(controlsFor(""), "add-photo-button-0")?.accessibilityLabel,
    ).toBe("profilePhotos.addPhoto:1");

    // Same glyph, rotated. The label has to say which job it is doing.
    expect(
      byTestID(controlsFor("https://example.test/dog.webp"), "remove-photo-0")
        ?.accessibilityLabel,
    ).toBe("profilePhotos.removePhoto:1");
  });

  it("makes every control an accessibility element", () => {
    for (const control of controlsFor("")) {
      expect(control.accessible).toBe(true);
    }
  });
});
