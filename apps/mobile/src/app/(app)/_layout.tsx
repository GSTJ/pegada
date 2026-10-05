import { Platform } from "react-native";
import { Stack } from "expo-router";
import Color from "color";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { markHeroDestinationPresented } from "@/components/HeroTransition/store";

type ProfileRouteParams = {
  id?: string;
  heroRunId?: string;
  heroTransition?: string;
  heroSceneTransition?: string;
};

const profileScreenListeners = ({ route }: { route: { params?: object } }) => ({
  transitionEnd: ({ data }: { data: { closing: boolean } }) => {
    const params = route.params as ProfileRouteParams | undefined;
    const runId = Number(params?.heroRunId);
    if (!params?.id || !Number.isSafeInteger(runId) || runId <= 0) return;
    markHeroDestinationPresented({ id: params.id, runId, closing: data.closing });
  },
});

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
        listeners={profileScreenListeners}
        options={({ route }) => {
          const params = route.params as ProfileRouteParams | undefined;
          const usesHeroSceneTransition = params?.heroSceneTransition === "1";
          const hasActiveHeroOverlay = params?.heroTransition === "1";

          if (usesHeroSceneTransition) {
            return {
              // The mutable overlay flag may switch off after settling or
              // invalidation, but the route's scene structure stays unchanged.
              presentation: "transparentModal",
              contentStyle: { backgroundColor: "transparent" },
              animation: hasActiveHeroOverlay ? "none" : "fade",
              ...(Platform.OS === "ios" && { animationDuration: 320 }),
              // Manual hero scenes own both forward and reverse motion.
              gestureEnabled: false,
            };
          }

          return {
            // Keep scene structure immutable for the route's lifetime. The
            // ordinary profile route keeps the app theme and native gesture.
            presentation: "card",
            contentStyle: { backgroundColor: theme.colors.background },
            animation: "fade",
            gestureEnabled: true,
          };
        }}
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
