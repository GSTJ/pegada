import { Tabs } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import Messages from "@/assets/images/messages";
import Profile from "@/assets/images/profile";

type TabBarIconProps = {
  focused: boolean;
  color: string;
};

// Hoisted out of the layout: an inline `tabBarIcon` is a fresh component type
// on every render, which remounts the icon whenever the tab bar updates.
const SwipeTabIcon = ({ color }: TabBarIconProps) => (
  <Logo colorStopOne={color} colorStopTwo={color} width={34} height={34} />
);

const MessagesTabIcon = ({ color }: TabBarIconProps) => (
  <Messages colorStopOne={color} colorStopTwo={color} width={34} height={34} />
);

const ProfileTabIcon = ({ color }: TabBarIconProps) => (
  <Profile colorStopOne={color} colorStopTwo={color} width={34} height={34} />
);

const TabsLayout = () => {
  const { theme } = useUnistyles();
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
          marginBottom: insets.bottom ? theme.spacing[0.5] : theme.spacing[3],
        },
        tabBarBadgeStyle: {
          backgroundColor: theme.colors.primary,
          color: theme.colors.background,
        },
      }}
    >
      <Tabs.Screen
        name="swipe"
        options={{
          tabBarButtonTestID: "tab-swipe",
          tabBarIcon: SwipeTabIcon,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarButtonTestID: "tab-messages",
          tabBarIcon: MessagesTabIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ProfileTabIcon,
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
