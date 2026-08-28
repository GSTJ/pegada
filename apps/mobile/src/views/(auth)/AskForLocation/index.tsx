import { useState } from "react";
import * as React from "react";
import { Alert, Linking, ScrollView, View } from "react-native";

import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { Text } from "@/components/text";
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
import {
  updateUserLocation,
  UpdateLocationError,
} from "./update-user-location";

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
