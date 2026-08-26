import { useState } from "react";
import * as React from "react";
import { Alert, Linking, ScrollView, View } from "react-native";

import * as Location from "expo-location";
import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { Text } from "@/components/text";
import { getTrcpContext } from "@/contexts/trcp-context";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

import {
  InformationIcon,
  LocationIcon,
  Prompt,
  scrollContent,
  Title,
  styles,
} from "./styles";

enum UpdateLocationError {
  PermissionNotGranted = "Location permission not granted",
}

const getApproximatedPosition = async () => {
  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24 * 2, // 2 days
  });

  if (lastKnownPosition) return lastKnownPosition.coords;

  const currentPostion = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,
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
    longitude: position.longitude,
  });

  const location = {
    latitude: position.latitude,
    longitude: position.longitude,
    city: geocode[0]?.city ?? null,
    state: geocode[0]?.region ?? null,
    country: geocode[0]?.country ?? null,
  };

  const newUserData =
    await getTrcpContext().client.user.update.mutate(location);

  getTrcpContext().myDog.get.setData(undefined, (oldDogData) => {
    if (!oldDogData) return undefined;
    return {
      ...oldDogData,
      user: {
        ...newUserData,
        ...location,
      },
    };
  });

  return newUserData;
};

const AskForLocation: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[scrollContent, { paddingTop: insets.top }]}
      >
        <View style={styles.locationView}>
          <LocationIcon
            width={100}
            height={100}
            fill={theme.colors.primary}
            style={styles.locationIcon}
          />
          <Title fontSize="xl" fontWeight="bold" style={styles.title}>
            {t("askForLocation.activateLocation")}
          </Title>
          <Prompt fontSize="xs" style={styles.prompt}>
            {t("askForLocation.permissionPrompt")}
          </Prompt>
        </View>
      </ScrollView>
      <View
        style={[
          styles.bottomView,
          {
            paddingBottom: Math.max(insets.bottom + 8, 20),
          },
        ]}
      >
        <View style={styles.informationRow}>
          <InformationIcon
            fill={theme.colors.primary}
            style={styles.informationIcon}
          />
          <Text fontSize="xs" fontWeight="medium">
            {t("askForLocation.locationUsage")}
          </Text>
        </View>

        <Button
          testID="location-allow"
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
                      },
                    },
                  ],
                );
              }

              sendError(error);

              Alert.alert(
                t("common.somethingWrong"),
                t("common.tryAgainLater"),
              );

              router.push(SceneName.Swipe);
            } finally {
              setLoading(false);
            }
          }}
        >
          {t("askForLocation.enableLocation")}
        </Button>
      </View>
    </View>
  );
};

export default AskForLocation;
