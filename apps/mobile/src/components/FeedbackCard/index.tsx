import * as React from "react";
import {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle
} from "react-native-reanimated";

import { ACTION_OFFSET } from "@/constants";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import LikeFeedback from "./components/LikeFeedback";
import MaybeFeedback from "./components/MaybeFeedback";
import NopeFeedback from "./components/NopeFeedback";
import { AbsolutePosition, Container, StyledMainCard } from "./styles";

interface FeedbackCardProps {
  dog: SwipeDog;
  translation: {
    x: SharedValue<number>;
    y: SharedValue<number>;
  };
  isFirst: boolean;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({
  dog,
  translation,
  isFirst
}) => {
  const likeOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(
        translation.x.value,
        [10, ACTION_OFFSET],
        [0, 1],
        Extrapolation.CLAMP
      )
    };
  });

  const nopeOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(
        translation.x.value,
        [-ACTION_OFFSET, -10],
        [1, 0],
        Extrapolation.CLAMP
      )
    };
  });

  const maybeOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(
        translation.y.value,
        [-ACTION_OFFSET, -10],
        [1, 0],
        Extrapolation.CLAMP
      )
    };
  });

  return (
    <Container isFirst={isFirst}>
      <AbsolutePosition pointerEvents="auto">
        <StyledMainCard dog={dog} />
      </AbsolutePosition>
      <AbsolutePosition style={maybeOpacity}>
        <MaybeFeedback />
      </AbsolutePosition>
      <AbsolutePosition style={nopeOpacity}>
        <NopeFeedback />
      </AbsolutePosition>
      <AbsolutePosition style={likeOpacity}>
        <LikeFeedback />
      </AbsolutePosition>
    </Container>
  );
};

export default FeedbackCard;
