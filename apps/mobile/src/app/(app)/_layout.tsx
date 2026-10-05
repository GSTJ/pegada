import { Platform } from "react-native";
import { Stack } from "expo-router";
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
        // UIKit effect views cannot be composited under a screen-level alpha
        // transition. Keep navigation native and spatial with a transform-only
        // push; the shared-profile route overrides this with `none` when its
        // manual hero transition is active.
        animation: "slide_from_right",
        headerTintColor: theme.colors.primary,

        contentStyle: {
          backgroundColor: theme.colors.background,
        },

        // The header is native chrome, so use UIKit's chrome material and
        // explicitly follow Pegada's in-app theme. `prominent` can resolve
        // to a light material after an in-app theme change on iOS, which
        // makes dark headers look milky until the navigation controller is
        // recreated.
        headerBlurEffect: theme.dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight",

        // react-native-screens warns that iOS 26's automatic top scroll-edge
        // effect can overlap an explicit headerBlurEffect. The header already
        // owns this material, so disable the second blur at the same edge.
        scrollEdgeEffects: {
          bottom: "hidden",
          left: "hidden",
          right: "hidden",
          top: "hidden",
        },

        headerStyle: {
          // Let the native material own the complete iOS background. A
          // translucent color here is composited over the blur, washing out
          // both the content and the dark material. Android does not support
          // headerBlurEffect, so it gets an intentional opaque app surface.
          backgroundColor: Platform.OS === "ios" ? "transparent" : theme.colors.background,
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
      <Stack.Screen name="profile/[id]" />
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
