import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { changeLanguage, use } from "i18next";
import { initReactI18next } from "react-i18next";

import { initI18n } from "@pegada/shared/i18n/i18n";

import HeroText from ".";

jest.mock("./styles", () => ({
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

test.each(["en-US", "pt-BR"])("renders %s without React key warnings", async (language) => {
  await changeLanguage(language);

  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    renderToStaticMarkup(<HeroText />);
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});
