import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { initI18n } from "@pegada/shared/i18n/i18n";
import { changeLanguage, use } from "i18next";
import { initReactI18next } from "react-i18next";

import HeroText from ".";

// Rendered through react-dom/server, so every styled-component is replaced by
// a plain host element. The cast is the mock's whole point: these are strings
// standing in for React Native styled components.
jest.mock<Record<string, string>>("./styles", () => ({
  Container: "div",
  FlexRowView: "div",
  Line: "span",
  RotatedRectangle: "span",
  Title: "span",
  UnderlineContainer: "span",
  WhiteTitle: "span",
}));

beforeAll(async () => {
  await initI18n(use(initReactI18next));
});

test.each(["en-US", "pt-BR"])(
  "renders %s without React key warnings",
  async (language) => {
    await changeLanguage(language);

    const consoleError = jest
      .spyOn(console, "error")
      .mockReturnValue(undefined);

    try {
      renderToStaticMarkup(<HeroText />);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  },
);
