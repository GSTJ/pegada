import { Platform } from "react-native";
import { Stack } from "expo-router";
import Color from "color";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

export default () => {
  const theme = useTheme();

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

        headerBlurEffect: "prominent",

        headerStyle: {
          // BlurEffect doesn't work on Android, so opacity is not necessary
          backgroundColor:
            Platform.OS === "ios"
              ? Color(theme.colors.background).alpha(0.5).toString()
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
      <Stack.Screen
        name="profile/[id]"
        options={({ route }) => ({
          // The photo overlay is the forward transition from Swipe. Running
          // the stack fade at the same time duplicates the whole card behind
          // it. The same route-level opt-out lets the shared elements reverse
          // cleanly on Back without a competing stack animation.
          animation:
            (route.params as { heroTransition?: string } | undefined)?.heroTransition === "1"
              ? "none"
              : "fade",
        })}
      />
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
          animation: "default",
          presentation: "modal",
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
