import * as React from "react";

/**
 * The defect: on any locale that is not EXACTLY `en-US` or `pt-BR`, the
 * language picker shows no current selection and the Profile row's subtitle is
 * right only by accident.
 *
 * `LanguageConfig` looks the current language up in a two-key map:
 *
 *   const value = languagesPickerData.find(({ id }) => id === i18n.language)
 *     ?? { id: i18n.language, name: LANGUAGES[Language.Default] };
 *
 * `i18n.language` is whatever `expo-localization` reported for the device —
 * the raw BCP-47 tag. The simulator this was found on runs `en-BR` (English
 * language, Brazil region), which is a perfectly ordinary configuration, and so
 * are `en-GB`, `en-CA` and `en-AU`. None of them match, so:
 *
 *   * the fallback branch invents an option whose id is the device tag, and no
 *     row in the sheet has that id, so `PickerSelectItem` marks nothing
 *     selected — verified on device, both rows came back `selected=false`
 *     while the app was plainly running in English;
 *   * the subtitle reads "English" because the FALLBACK's name is hardcoded to
 *     the default language's, not because anything resolved to English.
 *
 * i18next already knows the answer. `resolvedLanguage` is the tag it actually
 * loaded resources for after applying `fallbackLng` — "en-US" for a device on
 * "en-BR" — which is exactly the row that should be ticked.
 */

type CapturedProps = Record<string, unknown>;

const capturedSheetProps: CapturedProps[] = [];

jest.mock<Record<string, unknown>>("@/components/Picker", () => ({
  PickerSheet: (props: CapturedProps) => {
    capturedSheetProps.push(props);
    return null;
  },
}));

jest.mock<Record<string, unknown>>("./Config", () => {
  const passthrough =
    () =>
    ({ children }: { children?: React.ReactNode }) =>
      children;

  return {
    Config: {
      Root: passthrough(),
      Container: passthrough(),
      Title: passthrough(),
      Description: passthrough(),
      Arrow: () => null,
    },
  };
});

jest.mock<Record<string, unknown>>("@/assets/images/Translate.svg", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock<Record<string, unknown>>("@/services/error-tracking", () => ({
  sendError: jest.fn(),
}));

jest.mock<Record<string, unknown>>("react-native-unistyles", () => ({
  useUnistyles: () => ({ theme: { colors: { text: "#000" } } }),
}));

const mockI18n = {
  language: "en-US",
  resolvedLanguage: "en-US",
  changeLanguage: jest.fn(() => Promise.resolve()),
};

jest.mock<Record<string, unknown>>("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: mockI18n,
  }),
}));

import { renderToStaticMarkup } from "react-dom/server";

import { LanguageConfig } from "./language-config";

const renderFor = (language: string, resolvedLanguage?: string) => {
  capturedSheetProps.length = 0;
  mockI18n.language = language;
  mockI18n.resolvedLanguage = resolvedLanguage ?? language;

  renderToStaticMarkup(<LanguageConfig />);

  return capturedSheetProps[0]!;
};

describe("the language setting", () => {
  it("ticks the row the app is actually running in", () => {
    // The exact tags the two supported languages ship under still work.
    expect(renderFor("en-US").value).toMatchObject({ id: "en-US" });
    expect(renderFor("pt-BR").value).toMatchObject({ id: "pt-BR" });
  });

  it("ticks English on an English locale from another region", () => {
    // en-BR is what the QA simulator reports; en-GB/en-CA/en-AU are the same
    // shape and are a large share of real users. i18next resolves all of them
    // to the en-US bundle, so that is the row to tick.
    const props = renderFor("en-BR", "en-US");

    expect(props.value).toMatchObject({ id: "en-US", name: "English" });
  });

  it("ticks Portuguese on a Portuguese locale from another region", () => {
    const props = renderFor("pt-PT", "pt-BR");

    expect(props.value).toMatchObject({ id: "pt-BR", name: "Português" });
  });
});
