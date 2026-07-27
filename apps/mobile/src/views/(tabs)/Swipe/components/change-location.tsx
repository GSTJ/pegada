import { ActivityIndicator } from "react-native";

import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import Location from "@/assets/images/Location.svg";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/text";
import { SceneName } from "@/types/scene-name";

import { useCurrentCityText } from "../../../../hooks/use-current-city-text";
import { LocationButton } from "../styles";

const CurrentLocation = () => {
  const currentCityText = useCurrentCityText();

  return (
    <Text fontWeight="semibold" fontSize="sm">
      {currentCityText}
    </Text>
  );
};

const CurrentLocationError = () => {
  const { t } = useTranslation();

  return (
    <Text fontWeight="semibold" fontSize="sm">
      {
        t("common.nearYou") // Generic and non-user blocking message
      }
    </Text>
  );
};

const CurrentLocationLoading = () => {
  const theme = useTheme();

  return (
    <ActivityIndicator
      style={{ paddingHorizontal: theme.spacing[8] }}
      color={theme.colors.primary}
    />
  );
};

export const ChangeLocation = () => {
  const theme = useTheme();
  const router = useRouter();

  return (
    <LocationButton
      onPress={() => {
        router.push(SceneName.LocationMap);
      }}
    >
      <Location
        style={{
          marginRight: theme.spacing[2],
          marginTop: theme.spacing[0.5],
        }}
        width={15}
        height={15}
        fill={theme.colors.primary}
      />
      <NetworkBoundary
        suspenseFallback={<CurrentLocationLoading />}
        errorFallback={CurrentLocationError}
      >
        <CurrentLocation />
      </NetworkBoundary>
      <ArrowDown
        width={10}
        height={10}
        style={{
          marginTop: theme.spacing[1.5],
          marginLeft: theme.spacing[2],
        }}
        fill={theme.colors.primary}
      />
    </LocationButton>
  );
};
