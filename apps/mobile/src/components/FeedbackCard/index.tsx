import * as React from "react";
import {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useHeroRecoveryProgress } from "@/components/HeroTransition/motion";
import {
  isHeroSourceSurfaceHeld,
  useHeroState,
  useIsHeroShadowActive,
} from "@/components/HeroTransition/store";
import { SWIPE_CARD_HERO_SHADOW } from "@/components/MainCard/heroShadow";
import { ACTION_OFFSET } from "@/constants";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import LikeFeedback from "./components/LikeFeedback";
import MaybeFeedback from "./components/MaybeFeedback";
import NopeFeedback from "./components/NopeFeedback";
import { AbsolutePosition, ClippedCard, Container, StyledMainCard } from "./styles";

interface FeedbackCardProps {
  dog: SwipeDog;
  translation: {
    x: SharedValue<number>;
    y: SharedValue<number>;
  };
  isFirst: boolean;
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({ dog, translation, isFirst }) => {
  const tiltRotation = useSharedValue(0);
  const activeHero = useHeroState();
  const recovery = useHeroRecoveryProgress();
  const heroOwnsShadow = useIsHeroShadowActive(dog.id);
  const sourceSurfaceHeld = isFirst && isHeroSourceSurfaceHeld(activeHero, dog.id, "swipe");
  const handoffShadowRecovery = Boolean(
    isFirst &&
    activeHero.id === dog.id &&
    activeHero.phase === "reverse" &&
    activeHero.reverseFallback === "handoff",
  );
  const likeOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(translation.x.value, [10, ACTION_OFFSET], [0, 1], Extrapolation.CLAMP),
    };
  });

  const nopeOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(translation.x.value, [-ACTION_OFFSET, -10], [1, 0], Extrapolation.CLAMP),
    };
  });

  const maybeOpacity = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(translation.y.value, [-ACTION_OFFSET, -10], [1, 0], Extrapolation.CLAMP),
    };
  });

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 100 }, { rotateY: `${tiltRotation.value}deg` }],
  }));
  const recoveryShadowStyle = useAnimatedStyle(() => {
    if (!handoffShadowRecovery) return {};
    return {
      shadowColor: SWIPE_CARD_HERO_SHADOW.color,
      shadowOffset: SWIPE_CARD_HERO_SHADOW.offset,
      shadowOpacity: SWIPE_CARD_HERO_SHADOW.opacity * recovery.value,
      shadowRadius: SWIPE_CARD_HERO_SHADOW.radius,
      elevation: SWIPE_CARD_HERO_SHADOW.elevation * recovery.value,
    };
  }, [handoffShadowRecovery]);

  return (
    <Container
      $isFirst={isFirst}
      $heroOwnsShadow={heroOwnsShadow}
      $sourceSurfaceHeld={sourceSurfaceHeld}
      style={[tiltStyle, recoveryShadowStyle]}
    >
      <ClippedCard
        $sourceSurfaceHeld={sourceSurfaceHeld}
        pointerEvents={sourceSurfaceHeld ? "none" : "auto"}
        accessibilityElementsHidden={sourceSurfaceHeld}
        importantForAccessibility={sourceSurfaceHeld ? "no-hide-descendants" : "auto"}
      >
        <AbsolutePosition
          pointerEvents={isFirst ? "auto" : "none"}
          accessibilityElementsHidden={!isFirst}
          importantForAccessibility={isFirst ? "auto" : "no-hide-descendants"}
        >
          <StyledMainCard dog={dog} tiltRotation={tiltRotation} />
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
      </ClippedCard>
    </Container>
  );
};

export default FeedbackCard;
