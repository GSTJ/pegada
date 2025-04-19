import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import Location from "@/assets/images/Location.svg";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { useCurrentCityText } from "@/hooks/useCurrentCityText";
import { SceneName } from "@/types/SceneName";
import { Config } from "./Config";

const CurrentLocation = () => {
  const currentCityText = useCurrentCityText();

  return <Config.Description>{currentCityText}</Config.Description>;
};

const CurrentLocationError = () => {
  const { t } = useTranslation();

  return (
    <Config.Description>
      {
        t("common.nearYou") // Generic and non-user blocking message
      }
    </Config.Description>
  );
};

const CurrentLocationLoading = () => {
  const theme = useTheme();

  return (
    <ActivityIndicator
      style={{ paddingHorizontal: theme.spacing[8] }}
      color={theme.colors.text}
    />
  );
};
export const LocationConfig = () => {
  const { t } = useTranslation();

  const router = useRouter();
  const theme = useTheme();

  return (
    <Config.Root onPress={() => router.push(SceneName.LocationMap)}>
      <View style={{ width: 22, alignItems: "center" }}>
        <Location width={19} height={19} fill={theme.colors.text} />
      </View>

      <Config.Container>
        <Config.Title>{t("profile.updateLocation")}</Config.Title>
        <NetworkBoundary
          suspenseFallback={<CurrentLocationLoading />}
          errorFallback={CurrentLocationError}
        >
          <CurrentLocation />
        </NetworkBoundary>
      </Config.Container>

      <Config.Arrow />
    </Config.Root>
  );
};
