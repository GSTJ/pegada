import { Platform } from "react-native";

import { router, Stack } from "expo-router";

import Color from "color";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Close from "@/assets/images/Close.svg";
import { PressableArea } from "@/components/pressable-area";

const locationCloseButtonStyle = {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
} as const;

const LocationCloseButton = () => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <PressableArea
      testID="location-map-close"
      accessibilityRole="button"
      accessibilityLabel={t("pickerSheet.close")}
      onPress={() => router.back()}
      style={locationCloseButtonStyle}
    >
      <Close width={14} height={14} fill={theme.colors.text} />
    </PressableArea>
  );
};

const AppLayout = () => {
  const { theme } = useUnistyles();

  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerBackTitle: t("common.back"),
        headerTitleAlign: "center",
        animation: "fade",
        headerTintColor: theme.colors.primary,

        contentStyle: {
          backgroundColor: theme.colors.background,
        },

        // "prominent" follows the OS appearance rather than `theme.dark` —
        // when the app is forced to (or stuck on) one theme while the
        // system runs the other, the header glass renders in the wrong
        // theme's color. "dark"/"light" are the legacy, non-adaptive styles.
        headerBlurEffect: theme.dark ? "dark" : "light",

        headerStyle: {
          // BlurEffect doesn't work on Android, so opacity is not necessary
          backgroundColor:
            Platform.OS === "ios"
              ? new Color(theme.colors.background).alpha(0.5).toString()
              : theme.colors.background,
        },

        headerTransparent: true,

        headerTitleStyle: {
          color: theme.colors.text,
          // I want to customize the header font on every device but IOS,
          // as the native font is already great there.
          ...(Platform.OS !== "ios" && {
            fontFamily: theme.typography.fontFamily.bold,
            fontWeight: "bold",
            fontSize: theme.typography.sizes.lg.size,
          }),
        },
      }}
    >
      <Stack.Screen
        name="profile/edit"
        options={{
          headerTitle: t("editProfile.title"),
          headerShown: true,
          animation: "default",
        }}
      />
      <Stack.Screen name="profile/[id]" options={{ animation: "default" }} />
      <Stack.Screen
        name="preferences"
        options={{
          headerTitle: t("preferences.title"),
          headerShown: true,
          animation: "default",
        }}
      />
      <Stack.Screen name="force-update" />
      <Stack.Screen
        name="new-match"
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="location-map"
        options={{
          headerTitle: t("locationMap.title"),
          headerShown: true,
          headerLeft: LocationCloseButton,
          animation: "default",
          presentation: "modal",
          // A modal's swipe-to-dismiss is a drag gesture same as the map's
          // own pan — panning the map toward the bottom of the screen could
          // otherwise get read as "dismiss". The header back button already
          // covers leaving the screen, so losing the swipe costs nothing.
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="upgrade-wall"
        options={{
          animation: "slide_from_bottom",
          presentation: "modal",
        }}
      />
      <Stack.Screen name="chat/[matchId]" options={{ animation: "default" }} />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
};

export default AppLayout;
