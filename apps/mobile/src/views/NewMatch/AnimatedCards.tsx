import { useEffect } from "react";
import * as React from "react";
import { useWindowDimensions, View } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { useTheme } from "styled-components";

import { Image } from "@/components/Image";
import {
  DefaultLoadingComponent,
  NetworkBoundary
} from "@/components/NetworkBoundary";
import { api, RouterOutputs } from "@/contexts/TRPCProvider";
import {
  HeartEyesContainer,
  RotatedImageLeft,
  RotatedImageRight
} from "./styles";

interface AnimatedCardsProps {
  matchDog?: RouterOutputs["dog"]["get"];
}

const ROTATE_Z = 18;

const AnimatedCards: React.FC<AnimatedCardsProps> = ({ matchDog }) => {
  const rotateZ = useSharedValue(0);

  const [myDog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false
  });

  const windowDimensions = useWindowDimensions();
  const CARD_HEIGHT = windowDimensions.height < 800 ? 200 : 325;

  useEffect(() => {
    // eslint-disable-next-line react-compiler/react-compiler -- false positive
    rotateZ.value = withDelay(500, withTiming(ROTATE_Z, { duration: 500 }));
  }, [rotateZ]);

  const rotatedImageLeftStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: CARD_HEIGHT / 2 },
        { rotateZ: `${rotateZ.value}deg` },
        { translateY: -CARD_HEIGHT / 2 }
      ]
    };
  });

  const rotatedImageRightStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { translateY: CARD_HEIGHT / 2 },
        { rotateZ: `${-rotateZ.value}deg` },
        { translateY: -CARD_HEIGHT / 2 }
      ]
    };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <View>
        <RotatedImageRight
          source={{
            uri: myDog?.images[0]?.url,
            blurhash: myDog?.images[0]?.blurhash ?? undefined
          }}
          style={[
            rotatedImageLeftStyle,
            { height: CARD_HEIGHT, width: CARD_HEIGHT / 1.5 }
          ]}
        />
        <RotatedImageLeft
          source={{
            uri: matchDog?.images[0]?.url,
            blurhash: matchDog?.images[0]?.blurhash ?? undefined
          }}
          style={[
            rotatedImageRightStyle,
            { height: CARD_HEIGHT, width: CARD_HEIGHT / 1.5 }
          ]}
        />
      </View>
      <HeartEyesContainer>
        <Image
          source={require("@/assets/images/HeartEyesEmoji.webp")}
          style={{
            width: 70,
            height: 70
          }}
        />
      </HeartEyesContainer>
    </View>
  );
};

const AnimatedCardsErrorFallback = () => {
  const theme = useTheme();
  return (
    <Image
      source={require("@/assets/images/HeartEyesEmoji.webp")}
      style={{
        width: 70,
        height: 70,
        marginBottom: theme.spacing[5]
      }}
    />
  );
};

const AnimatedCardsLoading = () => {
  return (
    <View style={{ height: 200 }}>
      <DefaultLoadingComponent />
    </View>
  );
};

export default ({ matchDog }: AnimatedCardsProps) => (
  <NetworkBoundary
    suspenseFallback={<AnimatedCardsLoading />}
    errorFallback={AnimatedCardsErrorFallback}
  >
    <AnimatedCards matchDog={matchDog} />
  </NetworkBoundary>
);
