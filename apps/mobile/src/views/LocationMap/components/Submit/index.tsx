import * as React from "react";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { BottomAction } from "@/components/BottomAction";
import { StyledButton } from "./styles";

interface SubmitProps {
  loading?: boolean;
  onPress: () => void;
  dragging: SharedValue<number>;
}

export const Submit: React.FC<SubmitProps> = ({
  loading,
  onPress,
  dragging
}) => {
  const { t } = useTranslation();

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(
      dragging.value,
      [0, 1],
      // 1.5 so it goes a little faster
      [1.5, 0],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <Animated.View style={buttonAnimatedStyle}>
      <BottomAction.Container>
        <StyledButton loading={loading} onPress={onPress}>
          {t("locationMap.confirmLocation")}
        </StyledButton>
      </BottomAction.Container>
    </Animated.View>
  );
};
