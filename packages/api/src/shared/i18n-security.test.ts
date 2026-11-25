import { execFileSync } from "node:child_process";

import { initI18n } from "@pegada/shared/i18n/i18n";
import { Language } from "@pegada/shared/i18n/types/types";
import { createInstance } from "i18next";

it.each([Language.EnUs, Language.PtBr])(
  "initializes the shipped %s resources",
  async (language) => {
    const instance = createInstance();
    await initI18n(instance);
    await instance.changeLanguage(language);
    const result = instance.t("likeLimit.description", { count: 3 });
    expect(result).toContain(language === Language.PtBr ? "Você" : "You");
    expect(result).toContain("3");
    expect(result).not.toContain("{{count}}");
  },
);

it("does not recurse into inherited built-ins when merging resource bundles", () => {
  // Isolate the exploit so a vulnerable dependency cannot corrupt Jest itself.
  expect(() =>
    execFileSync(process.execPath, [
      "-e",
      `
    const assert = require('node:assert/strict');
    const i18next = require(${JSON.stringify(require.resolve("i18next"))});
    const original = Object.prototype.hasOwnProperty.call;
    i18next.init({ lng: 'en', resources: { en: { translation: {} } } });
    i18next.addResourceBundle('en', 'translation', {
      hasOwnProperty: { call: 'corrupted' },
    }, true, true);
    assert.equal(Object.prototype.hasOwnProperty.call, original);
  `,
    ]),
  ).not.toThrow();
});
