import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

import React from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";

import { useBottomSheetModal } from "@gorhom/bottom-sheet";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

const CustomBackdrop = ({
  style,
  animatedPosition,
}: BottomSheetBackdropProps) => {
  const { height } = useWindowDimensions();
  const { dismissAll } = useBottomSheetModal();
  const containerAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(
        animatedPosition.value,
        [0, height],
        [0.9, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View
      // oxlint-disable-next-line react-native/no-color-literals, react-native/no-inline-styles -- The backdrop is always black at 0 opacity and animates from there; a theme colour would be wrong.
      style={[style, { backgroundColor: "black" }, containerAnimatedStyle]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={dismissAll} />
    </Animated.View>
  );
};

export const renderCustomBackdrop = (props: BottomSheetBackdropProps) => (
  <CustomBackdrop {...props} />
);
