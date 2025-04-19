import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { useTheme } from "styled-components/native";

import Logo from "@/assets/images/Logo";
import Messages from "@/assets/images/Messages";
import Profile from "@/assets/images/Profile";

interface TabBarIconProps {
  focused: boolean;
  color: string;
}

export default () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      sceneContainerStyle={{ backgroundColor: theme.colors.background }}
      screenOptions={{
        tabBarInactiveTintColor: theme.colors.text,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopWidth: 0,
          elevation: 0,
          marginVertical: theme.spacing[3],
          marginBottom: insets.bottom ? theme.spacing[0.5] : theme.spacing[3]
        },
        tabBarBadgeStyle: {
          backgroundColor: theme.colors.primary,
          color: theme.colors.background
        }
      }}
    >
      <Tabs.Screen
        name="swipe"
        options={{
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <Logo
              colorStopOne={color}
              colorStopTwo={color}
              width={34}
              height={34}
            />
          )
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <Messages
              colorStopOne={color}
              colorStopTwo={color}
              width={34}
              height={34}
            />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <Profile
              colorStopOne={color}
              colorStopTwo={color}
              width={34}
              height={34}
            />
          )
        }}
      />
    </Tabs>
  );
};
