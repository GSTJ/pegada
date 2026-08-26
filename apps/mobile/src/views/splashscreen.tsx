import type { ImageStyle } from "react-native";

import { Animated, StyleSheet } from "react-native";

import Constants from "expo-constants";

import { useUnistyles } from "react-native-unistyles";

import SplashscreenImage from "@/assets/images/splash-android.png";

const styles = StyleSheet.create<{ splashImage: ImageStyle }>({
  splashImage: { width: "100%", height: "100%" },
});

const AnimatedSplashScreen = () => {
  const { theme } = useUnistyles();

  const backgroundColor = theme.dark
    ? Constants.expoConfig?.ios?.splash?.dark?.backgroundColor
    : Constants.expoConfig?.ios?.splash?.backgroundColor;

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor }]}
    >
      <Animated.Image
        style={[
          styles.splashImage,
          {
            resizeMode:
              Constants.expoConfig?.ios?.splash?.resizeMode ?? "contain",
          },
        ]}
        source={SplashscreenImage}
      />
    </Animated.View>
  );
};

export default AnimatedSplashScreen;
