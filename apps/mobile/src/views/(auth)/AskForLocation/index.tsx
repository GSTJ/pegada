import { useState } from "react";
import * as React from "react";
import { Alert, Linking, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import Information from "@/assets/images/Information.svg";
import LocationIcon from "@/assets/images/Location.svg";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import { BottomView, Container, InformationRow, LocationView } from "./styles";

enum UpdateLocationError {
  PermissionNotGranted = "Location permission not granted"
}

const getApproximatedPosition = async () => {
  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24 * 2 // 2 days
  });

  if (lastKnownPosition) return lastKnownPosition.coords;

  const currentPostion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low
  });

  return currentPostion.coords;
};

export const updateUserLocation = async (newLocation?: {
  longitude: number;
  latitude: number;
}) => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== "granted") {
    throw new Error(UpdateLocationError.PermissionNotGranted);
  }

  const position = newLocation ?? (await getApproximatedPosition());

  const geocode = await Location.reverseGeocodeAsync({
    latitude: position.latitude,
    longitude: position.longitude
  });

  const location = {
    latitude: position.latitude,
    longitude: position.longitude,
    city: geocode[0]?.city ?? null,
    state: geocode[0]?.region ?? null,
    country: geocode[0]?.country ?? null
  };

  const newUserData =
    await getTrcpContext().client.user.update.mutate(location);

  getTrcpContext().myDog.get.setData(undefined, (oldDogData) => {
    if (!oldDogData) return undefined;
    return {
      ...oldDogData,
      user: {
        ...newUserData,
        ...location
      }
    };
  });

  return newUserData;
};

const AskForLocation: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Container>
      <ScrollView
        contentContainerStyle={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: insets.top
        }}
      >
        <LocationView>
          <LocationIcon
            width={100}
            height={100}
            fill={theme.colors.primary}
            style={{ marginBottom: 20 }}
          />
          <Text
            fontSize="xl"
            fontWeight="bold"
            style={{ textAlign: "center", marginBottom: 4 }}
          >
            {t("askForLocation.activateLocation")}
          </Text>
          <Text fontSize="xs" style={{ textAlign: "center" }}>
            {t("askForLocation.permissionPrompt")}
          </Text>
        </LocationView>
      </ScrollView>
      <BottomView
        style={{
          paddingBottom: Math.max(insets.bottom + 8, 20)
        }}
      >
        <InformationRow>
          <Information
            fill={theme.colors.primary}
            style={{
              width: 21,
              height: 21,
              marginRight: 10
            }}
          />
          <Text fontSize="xs" fontWeight="medium">
            {t("askForLocation.locationUsage")}
          </Text>
        </InformationRow>

        <Button
          loading={loading}
          onPress={async () => {
            try {
              setLoading(true);
              await updateUserLocation();
              router.push("/swipe");
            } catch (error) {
              if (
                error instanceof Error &&
                error.message === UpdateLocationError.PermissionNotGranted
              ) {
                return Alert.alert(
                  t("askForLocation.enableLocation"),
                  t("askForLocation.permissionPrompt"),
                  [
                    {
                      text: t("askForLocation.activate"),
                      onPress: () => {
                        Linking.openSettings().catch(sendError);
                      }
                    }
                  ]
                );
              }

              sendError(error);

              Alert.alert(
                t("common.somethingWrong"),
                t("common.tryAgainLater")
              );

              router.push(SceneName.Swipe);
            } finally {
              setLoading(false);
            }
          }}
        >
          {t("askForLocation.enableLocation")}
        </Button>
      </BottomView>
    </Container>
  );
};

export default AskForLocation;
