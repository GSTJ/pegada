import type { SharedValue } from "react-native-reanimated";

import * as React from "react";
import { View } from "react-native";

import Animated, {
  Extrapolation,
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";

import { Bubble } from "../Bubble";
import { Shadow, styles } from "./styles";

type MarkerIconProps = React.ComponentProps<typeof Svg>;

const MarkerIcon: React.FC<MarkerIconProps> = (props) => (
  <Svg width="30.821" height="36.55" viewBox="0 0 30.821 36.55" {...props}>
    <Path
      d="M85.983,6a15.428,15.428,0,0,0-15.41,15.41c0,10.545,13.791,20.026,14.378,20.68a1.388,1.388,0,0,0,2.065,0c.587-.654,14.378-10.135,14.378-20.68A15.428,15.428,0,0,0,85.983,6Zm0,23.164a7.753,7.753,0,1,1,7.753-7.753A7.753,7.753,0,0,1,85.983,29.164Z"
      x={-70.573}
      y={-6}
    />
  </Svg>
);

export const Marker: React.FC<{
  dragging: SharedValue<number>;
  touchStarted: boolean;
}> = ({ dragging, touchStarted }) => {
  const { colors } = useUnistyles().theme;

  const markerViewStyle = useAnimatedStyle(() => {
    "worklet";
    const markerTop = interpolate(
      dragging.value,
      [1, 0],
      [-15, 0],
      Extrapolation.CLAMP,
    );

    return {
      top: markerTop,
    };
  });

  // Unfortunately interpolate color animations are not working well
  // on android with svg's fill prop. So we have to use two svg's
  // and animate their opacity instead.
  const animatedMarkerStyle = useAnimatedStyle(() => {
    "worklet";
    return { opacity: dragging.value };
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.content}>
        <Shadow style={styles.shadow} />
        <Animated.View style={markerViewStyle}>
          <MarkerIcon fill={colors.primary} />
          <Animated.View style={[styles.markerWrapper, animatedMarkerStyle]}>
            <MarkerIcon fill={colors.text} />
          </Animated.View>
        </Animated.View>
        {!touchStarted && <Bubble entering={FadeInDown} exiting={FadeOutUp} />}
      </View>
    </View>
  );
};
