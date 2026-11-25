import { initI18n } from "@pegada/shared/i18n/i18n";
import { Language } from "@pegada/shared/i18n/types/types";
import { createInstance } from "i18next";

it("initializes the shipped English and Portuguese resources", async () => {
  const instance = createInstance();
  await initI18n(instance);
  for (const language of [Language.EnUs, Language.PtBr]) {
    await instance.changeLanguage(language);
    const result = instance.t("likeLimit.description", { count: 3 });
    expect(result).not.toBe("likeLimit.description");
    expect(result).not.toContain("{{count}}");
  }
});

it("does not recurse into inherited built-ins when merging resource bundles", async () => {
  const instance = createInstance();
  await initI18n(instance);
  const originalCall = Object.prototype.hasOwnProperty.call;
  try {
    instance.addResourceBundle(
      "en",
      "security-probe",
      {
        hasOwnProperty: { call: "corrupted" },
      },
      true,
      true,
    );
    expect(Object.prototype.hasOwnProperty.call).toBe(originalCall);
    expect(Object.prototype.hasOwnProperty.call({}, "missing")).toBe(false);
  } finally {
    Object.prototype.hasOwnProperty.call = originalCall;
  }
});
