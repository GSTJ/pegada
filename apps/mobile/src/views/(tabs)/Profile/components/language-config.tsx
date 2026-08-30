import type { PickerSheetRef } from "@/components/Picker";

import { useRef } from "react";

import { Language } from "@pegada/shared/i18n/types/types";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Translate from "@/assets/images/Translate.svg";
import { PickerSheet } from "@/components/Picker";
import { sendError } from "@/services/error-tracking";

import { Config } from "./Config";

// Not translating languages for now, as it's useful to
// have them written in the language they represent
const LANGUAGES = {
  "pt-BR": "Português",
  "en-US": "English",
};

const languagesPickerData = Object.entries(LANGUAGES).map(([id, name]) => ({
  id,
  name,
}));

export const LanguageConfig = () => {
  const { t, i18n } = useTranslation();

  // `resolvedLanguage`, not `language`. The latter is the raw device tag
  // expo-localization reported, and only two tags on earth match this list
  // exactly. A phone set to English in Brazil reports `en-BR`; `en-GB`,
  // `en-CA` and `en-AU` are the same shape and are a great many real users.
  // For all of them the lookup below missed, the fallback invented an option
  // whose id no row in the sheet carries, and the picker showed NOTHING
  // selected while the app was plainly running in English — the subtitle read
  // "English" only because the fallback hardcodes the default language's name.
  //
  // `resolvedLanguage` is the tag i18next actually loaded resources for after
  // applying `fallbackLng`, so it is by definition one of the two we ship, and
  // it is the row the user is actually reading the app in.
  const currentLanguage = i18n.resolvedLanguage ?? i18n.language;

  const { theme } = useUnistyles();

  const value = languagesPickerData.find(
    ({ id }) => id === currentLanguage,
  ) ?? {
    id: currentLanguage,
    name: LANGUAGES[Language.Default],
  };

  const pickerSheetRef = useRef<PickerSheetRef>(null);

  return (
    <Config.Root
      testID="profile-open-language"
      onPress={() => pickerSheetRef?.current?.present()}
    >
      <Translate width={22} height={22} fill={theme.colors.text} />

      <Config.Container>
        <Config.Title>{t("profile.language")}</Config.Title>
        <Config.Description>{value.name}</Config.Description>
      </Config.Container>

      <Config.Arrow />

      <PickerSheet
        title={t("profile.language")}
        placeholder={t("profile.language")}
        value={value}
        data={languagesPickerData}
        itemTestIDPrefix="language-item-"
        onChange={(item) => {
          i18n
            .changeLanguage(item.id as keyof typeof LANGUAGES)
            .catch(sendError);
        }}
        ref={pickerSheetRef}
      />
    </Config.Root>
  );
};
