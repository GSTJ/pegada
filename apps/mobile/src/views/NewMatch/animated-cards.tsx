import type { RouterOutputs } from "@/contexts/trpc-provider";

import { useEffect } from "react";
import * as React from "react";
import { useWindowDimensions, View } from "react-native";

import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import {
  DefaultLoadingComponent,
  NetworkBoundary,
} from "@/components/NetworkBoundary";
import { api } from "@/contexts/trpc-provider";

import {
  CardsColumn,
  HeartEyesContainer,
  HeartEyesEmoji,
  HeartEyesEmojiStandalone,
  LoadingBox,
  RotatedImageLeft,
  RotatedImageRight,
} from "./styles";

interface AnimatedCardsProps {
  matchDog?: RouterOutputs["dog"]["get"];
}

const ROTATE_Z = 18;

const AnimatedCards: React.FC<AnimatedCardsProps> = ({ matchDog }) => {
  const rotateZ = useSharedValue(0);

  const [myDog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false,
  });

  const windowDimensions = useWindowDimensions();
  const CARD_HEIGHT = windowDimensions.height < 800 ? 200 : 325;

  useEffect(() => {
    rotateZ.value = withDelay(500, withTiming(ROTATE_Z, { duration: 500 }));
  }, [rotateZ]);

  const rotatedImageLeftStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: CARD_HEIGHT / 2 },
        { rotateZ: `${rotateZ.value}deg` },
        { translateY: -CARD_HEIGHT / 2 },
      ],
    };
  });

  const rotatedImageRightStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: CARD_HEIGHT / 2 },
        { rotateZ: `${-rotateZ.value}deg` },
        { translateY: -CARD_HEIGHT / 2 },
      ],
    };
  });

  return (
    <CardsColumn>
      <View>
        <RotatedImageRight
          source={{
            uri: myDog?.images[0]?.url,
            blurhash: myDog?.images[0]?.blurhash ?? undefined,
          }}
          style={[
            rotatedImageLeftStyle,
            { height: CARD_HEIGHT, width: CARD_HEIGHT / 1.5 },
          ]}
        />
        <RotatedImageLeft
          source={{
            uri: matchDog?.images[0]?.url,
            blurhash: matchDog?.images[0]?.blurhash ?? undefined,
          }}
          style={[
            rotatedImageRightStyle,
            { height: CARD_HEIGHT, width: CARD_HEIGHT / 1.5 },
          ]}
        />
      </View>
      <HeartEyesContainer>
        <HeartEyesEmoji
          source={require("@/assets/images/HeartEyesEmoji.webp")}
        />
      </HeartEyesContainer>
    </CardsColumn>
  );
};

const AnimatedCardsErrorFallback = () => (
  <HeartEyesEmojiStandalone
    source={require("@/assets/images/HeartEyesEmoji.webp")}
  />
);

const AnimatedCardsLoading = () => (
  <LoadingBox>
    <DefaultLoadingComponent />
  </LoadingBox>
);

const AnimatedCardsBoundary = ({ matchDog }: AnimatedCardsProps) => (
  <NetworkBoundary
    suspenseFallback={<AnimatedCardsLoading />}
    errorFallback={AnimatedCardsErrorFallback}
  >
    <AnimatedCards matchDog={matchDog} />
  </NetworkBoundary>
);

export default AnimatedCardsBoundary;
