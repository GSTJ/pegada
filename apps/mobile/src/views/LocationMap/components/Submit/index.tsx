import * as React from "react";
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import { StyledButton } from "./styles";

interface SubmitProps {
  loading?: boolean;
  onPress: () => void;
  dragging: SharedValue<number>;
}

export const Submit: React.FC<SubmitProps> = ({ loading, onPress, dragging }) => {
  const { t } = useTranslation();
  const { height } = useBottomActionStyle();

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    "worklet";
    const translateY = interpolate(dragging.value, [0, 1], [0, height], Extrapolation.CLAMP);

    return { transform: [{ translateY }] };
  }, [height]);

  return (
    <Animated.View style={buttonAnimatedStyle}>
      <BottomAction.Container>
        <StyledButton testID="location-map-confirm" loading={loading} onPress={onPress}>
          {t("locationMap.confirmLocation")}
        </StyledButton>
      </BottomAction.Container>
    </Animated.View>
  );
};
