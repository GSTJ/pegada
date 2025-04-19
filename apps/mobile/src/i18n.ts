import { getLocales } from "expo-localization";
import i18n, { LanguageDetectorAsyncModule } from "i18next";
import { initReactI18next } from "react-i18next";

import { initI18n } from "@pegada/shared/i18n/i18n";

import { sendError } from "./services/errorTracking";
import { getData, StorageKeys, storeData } from "./services/storage";

export const getSystemLanguage = () => {
  const phoneLanguage = getLocales()?.[0]?.languageTag;
  return phoneLanguage;
};

const languageDetector: LanguageDetectorAsyncModule = {
  type: "languageDetector",
  async: true,
  init: () => {},
  detect: async () => {
    const phoneLanguage = getSystemLanguage();

    try {
      const userSelectedLanguage = await getData(StorageKeys.Language);
      if (userSelectedLanguage) return userSelectedLanguage;

      return phoneLanguage;
    } catch (error) {
      sendError(error);
      return phoneLanguage;
    }
  },
  cacheUserLanguage: async (language) => {
    try {
      await storeData(StorageKeys.Language, language);
    } catch (error) {
      sendError(error);
    }
  }
};

initI18n(i18n.use(languageDetector).use(initReactI18next)).catch(sendError);

export default i18n;
