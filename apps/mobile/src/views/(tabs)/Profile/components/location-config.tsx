import { ActivityIndicator } from "react-native";

import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Location from "@/assets/images/Location.svg";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { useCurrentCityText } from "@/hooks/use-current-city-text";
import { SceneName } from "@/types/scene-name";

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
  const { theme } = useUnistyles();

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
  const { theme } = useUnistyles();

  return (
    <Config.Root
      testID="profile-open-location"
      onPress={() => router.push(SceneName.LocationMap)}
    >
      <Config.IconSlot>
        <Location width={19} height={19} fill={theme.colors.text} />
      </Config.IconSlot>

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
