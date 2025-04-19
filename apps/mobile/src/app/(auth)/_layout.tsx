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
          backgroundColor: theme.colors.background
        },
        animation: "fade",
        headerTintColor: theme.colors.primary,
        headerStyle: {
          backgroundColor: theme.colors.background
        },
        headerTitleStyle: {
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: 20,
          color: theme.colors.text
        }
      }}
      initialRouteName="sign-in"
    >
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="one-time-code" />
      <Stack.Screen
        name="create-profile"
        options={{
          headerTitle: t("createProfile.title"),
          headerShown: true
        }}
      />
      <Stack.Screen
        name="complete-profile"
        options={{
          headerTitle: t("completeProfile.title"),
          headerShown: true
        }}
      />
      <Stack.Screen name="ask-for-location" />
    </Stack>
  );
};
