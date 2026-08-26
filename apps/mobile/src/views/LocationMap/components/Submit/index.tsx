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
    const opacity = interpolate(
      dragging.value,
      [0, 1],
      // 1.5 so it goes a little faster
      [1.5, 0],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  return (
    <Animated.View style={buttonAnimatedStyle}>
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
