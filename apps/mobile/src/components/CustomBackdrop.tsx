import React from "react";
import { Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle
} from "react-native-reanimated";
import {
  BottomSheetBackdropProps,
  useBottomSheetModal
} from "@gorhom/bottom-sheet";

const CustomBackdrop = ({
  style,
  animatedPosition
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
        Extrapolation.CLAMP
      )
    };
  });

  return (
    <Animated.View
      // eslint-disable-next-line react-native/no-color-literals, react-native/no-inline-styles
      style={[style, { backgroundColor: "black" }, containerAnimatedStyle]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={dismissAll} />
    </Animated.View>
  );
};

export const renderCustomBackdrop = (props: BottomSheetBackdropProps) => (
  <CustomBackdrop {...props} />
);
