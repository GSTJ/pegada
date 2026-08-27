import type { SharedValue } from "react-native-reanimated";

import * as React from "react";

import { useTranslation } from "react-i18next";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

import { BottomAction } from "@/components/BottomAction";

import { StyledButton, styles } from "./styles";

type SubmitProps = {
  loading?: boolean;
  onPress: () => void;
  dragging: SharedValue<number>;
};

export const Submit: React.FC<SubmitProps> = ({
  loading,
  onPress,
  dragging,
}) => {
  const { t } = useTranslation();

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    // Faded out by the time the drag is two thirds of the way in, rather than
    // by starting at `opacity: 1.5`. That is not a legal opacity: Android
    // hands it to `View.setAlpha`, whose contract is 0..1, and the button was
    // missing from the accessibility tree entirely on that platform — visible
    // on screen, unreachable to Maestro and to TalkBack alike.
    const opacity = interpolate(
      dragging.value,
      [0, 2 / 3],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  return (
    /*
      Full-bleed and absolute, not a bare wrapper. `BottomAction.Container` is
      itself `position: absolute; bottom: 0`, so an auto-height parent measured
      zero — and a zero-height ancestor makes every descendant fail Android's
      `isVisibleToUser`, which is the second reason "Confirm Location" never
      surfaced. `box-none` keeps the overlay out of the map's gestures.
    */
    <Animated.View
      pointerEvents="box-none"
      style={[styles.submitOverlay, buttonAnimatedStyle]}
    >
      <BottomAction.Container>
        <StyledButton
          testID="location-map-confirm"
          loading={loading}
          onPress={onPress}
          style={styles.styledButton}
        >
          {t("locationMap.confirmLocation")}
        </StyledButton>
      </BottomAction.Container>
    </Animated.View>
  );
};
