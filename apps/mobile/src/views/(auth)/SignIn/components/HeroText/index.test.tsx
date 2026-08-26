import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { initI18n } from "@pegada/shared/i18n/i18n";
import { changeLanguage, use } from "i18next";
import { initReactI18next } from "react-i18next";

import HeroText from ".";

// Rendered through react-dom/server, so nothing React Native may actually
// load: this package's jest config has no RN transform and `react-native`'s
// entry point is Flow-typed. Everything the component renders is therefore
// replaced by a plain host element.
//
// `Title` and `WhiteTitle` are stubbed as components that drop their props
// rather than as bare host strings: since the migration they are handed
// `fontSize`/`fontWeight`, and React logs unknown DOM props through
// `console.error` — the exact signal these tests assert on.
jest.mock<Record<string, unknown>>("./styles", () => {
  // A jest.mock factory is hoisted above the imports, so it has to reach for
  // its own React.
  const { createElement } = require("react");

  const hostElement = (element: string) =>
    function Stub({ children }: { children?: React.ReactNode }) {
      return createElement(element, null, children);
    };

  return {
    Title: hostElement("span"),
    WhiteTitle: hostElement("span"),
    styles: {},
  };
});

// The `View`s the migration left in place of `Container`/`FlexRowView`/
// `UnderlineContainer`. Under `NODE_ENV=test` the Unistyles babel plugin is a
// no-op, so this import really does resolve to React Native rather than to the
// plugin's wrapper.
jest.mock<{ View: string }>("react-native", () => ({ View: "div" }));

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
