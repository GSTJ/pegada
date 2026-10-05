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
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        // Auth screens contain blur-backed bottom actions. A spatial push
        // keeps those native effects out of a screen-level alpha transition.
        animation: "slide_from_right",
        headerTintColor: theme.colors.primary,

        headerBlurEffect: theme.dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight",

        scrollEdgeEffects: {
          bottom: "hidden",
          left: "hidden",
          right: "hidden",
          top: "hidden",
        },

        headerStyle: {
          backgroundColor: Platform.OS === "ios" ? "transparent" : theme.colors.background,
        },
        // Native-stack only applies headerBlurEffect to a translucent header.
        // The two header-bearing auth forms add the measured iOS header height
        // to their scroll content; Android keeps its opaque, layout-consuming
        // fallback instead of pretending to support this material.
        headerTransparent: Platform.OS === "ios",
        headerTitleStyle: {
          color: theme.colors.text,
          ...(Platform.OS !== "ios" && {
            fontFamily: theme.typography.fontFamily.bold,
            fontWeight: "bold",
            fontSize: theme.typography.sizes.lg.size,
          }),
        },
      }}
      initialRouteName="sign-in"
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="one-time-code" />
      <Stack.Screen
        name="create-profile"
        options={{
          headerTitle: t("createProfile.title"),
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="complete-profile"
        options={{
          headerTitle: t("completeProfile.title"),
          headerShown: true,
        }}
      />
      <Stack.Screen name="ask-for-location" />
    </Stack>
  );
};
