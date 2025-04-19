import { useRef } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { Language } from "@pegada/shared/i18n/types/types";

import Translate from "@/assets/images/Translate.svg";
import { PickerSheet } from "@/components/Picker";
import { sendError } from "@/services/errorTracking";
import { Config } from "./Config";

// Not translating languages for now, as it's useful to
// have them written in the language they represent
const LANGUAGES = {
  "pt-BR": "Português",
  "en-US": "English"
};

const languagesPickerData = Object.entries(LANGUAGES).map(([id, name]) => ({
  id,
  name
}));

export const LanguageConfig = () => {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const theme = useTheme();

  const value = languagesPickerData.find(
    ({ id }) => id === currentLanguage
  ) ?? { id: currentLanguage, name: LANGUAGES[Language.Default] };

  const pickerSheetRef = useRef<BottomSheetModal>(null);

  return (
    <Config.Root onPress={() => pickerSheetRef?.current?.present()}>
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
        snapPoints={["40%"]}
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
