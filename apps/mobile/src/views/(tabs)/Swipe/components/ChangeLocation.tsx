import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import Location from "@/assets/images/Location.svg";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";
import { SceneName } from "@/types/SceneName";
import { useCurrentCityText } from "../../../../hooks/useCurrentCityText";

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
    <PressableArea
      onPress={() => {
        router.push(SceneName.LocationMap);
      }}
      style={{
        padding: theme.spacing[2],
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        marginBottom: theme.spacing[2]
      }}
    >
      <Location
        style={{
          marginRight: theme.spacing[2],
          marginTop: theme.spacing[0.5]
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
          marginLeft: theme.spacing[2]
        }}
        fill={theme.colors.primary}
      />
    </PressableArea>
  );
};
