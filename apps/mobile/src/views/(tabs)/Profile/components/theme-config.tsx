import type { ActiveTheme } from "@/contexts/theme-provider";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useRef } from "react";

import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import LightMode from "@/assets/images/LightMode.svg";
import { PickerSheet } from "@/components/Picker";
import { useActiveTheme } from "@/contexts/theme-provider";
import { sendError } from "@/services/error-tracking";

import { Config } from "./Config";

export const ThemeConfig = () => {
  const { activeTheme, setActiveTheme } = useActiveTheme();

  const { theme } = useUnistyles();
  const { t } = useTranslation();

  const data = [
    {
      id: "light",
      name: t("themes.light"),
    },
    {
      id: "dark",
      name: t("themes.dark"),
    },
    {
      id: null,
      name: t("themes.automatic"),
    },
  ];

  const value = data.find((item) => item.id === activeTheme);

  const pickerSheetRef = useRef<BottomSheetModal>(null);

  return (
    <Config.Root
      testID="profile-open-theme"
      onPress={() => pickerSheetRef?.current?.present()}
    >
      <LightMode width={22} height={22} fill={theme.colors.text} />

      <Config.Container>
        <Config.Title>{t("profile.theme")}</Config.Title>
        <Config.Description>{value?.name}</Config.Description>
      </Config.Container>

      <Config.Arrow />

      <PickerSheet
        title={t("profile.theme")}
        placeholder={t("profile.theme")}
        value={value}
        data={data}
        itemTestIDPrefix="theme-item-"
        onChange={(item) => {
          setActiveTheme(item.id as ActiveTheme).catch(sendError);
        }}
        ref={pickerSheetRef}
      />
    </Config.Root>
  );
};
