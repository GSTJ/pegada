import { Animated, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { useTheme } from "styled-components/native";

import SplashscreenImage from "@/assets/images/splash-android.png";

const AnimatedSplashScreen = () => {
  const theme = useTheme();

  const backgroundColor = theme.dark
    ? Constants.expoConfig?.ios?.splash?.dark?.backgroundColor
    : Constants.expoConfig?.ios?.splash?.backgroundColor;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor }]}
    >
      <Animated.Image
        style={{
          width: "100%",
          height: "100%",
          resizeMode: Constants.expoConfig?.ios?.splash?.resizeMode || "contain"
        }}
        source={SplashscreenImage}
      />
    </Animated.View>
  );
};

export default AnimatedSplashScreen;
