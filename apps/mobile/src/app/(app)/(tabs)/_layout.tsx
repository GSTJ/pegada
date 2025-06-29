import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { useTheme } from "styled-components/native";

import Logo from "@/assets/images/Logo";
import Messages from "@/assets/images/Messages";
import Profile from "@/assets/images/Profile";

const getSwipeIcon = ({ color }: { color: string }) => (
  <Logo colorStopOne={color} colorStopTwo={color} width={34} height={34} />
);

const getMessagesIcon = ({ color }: { color: string }) => (
  <Messages colorStopOne={color} colorStopTwo={color} width={34} height={34} />
);

const getProfileIcon = ({ color }: { color: string }) => (
  <Profile colorStopOne={color} colorStopTwo={color} width={34} height={34} />
);

export default () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: theme.colors.background },
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
          tabBarIcon: getSwipeIcon
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: getMessagesIcon
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: getProfileIcon
        }}
      />
    </Tabs>
  );
};
