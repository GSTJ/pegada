import { StyleSheet } from "react-native";

import Color from "color";
import AnimatedLottieView from "lottie-react-native";
import Animated from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

import { Image } from "@/components/image";
import { Text } from "@/components/text";

export const Container = styled.View`
  background-color: ${(props) => props.theme.colors.background};
  flex: 1;
`;

export const Content = styled(SafeAreaView)`
  flex: 1;
  gap: 10px;
`;

const AnimatedImage = Animated.createAnimatedComponent(Image);
export const RotatedImageLeft = styled(AnimatedImage)`
  border-radius: ${(props) => props.theme.radii.lg}px;
  background-color: ${(props) => props.theme.colors.card};
  border-width: 1px;
  border-color: ${(props) => props.theme.colors.border};
`;

export const RotatedImageRight = styled(RotatedImageLeft)`
  position: absolute;
`;

export const HeartEyesContainer = styled.View`
  border-radius: ${(props) => props.theme.radii.round}px;
  background-color: ${(props) =>
    new Color(props.theme.colors.primary).alpha(0.5).rgb().string()};
  padding: ${(props) => props.theme.spacing[1.5]}px;
  margin-top: -35px;
  margin-bottom: ${(props) => props.theme.spacing[2]}px;
`;

export const CardsColumn = styled.View`
  align-items: center;
`;

export const HeartEyesEmoji = styled(Image)`
  width: 70px;
  height: 70px;
`;

/** Same emoji, standing in for the whole card stack when it fails to load. */
export const HeartEyesEmojiStandalone = styled(HeartEyesEmoji)`
  margin-bottom: ${({ theme }) => theme.spacing[5]}px;
`;

export const LoadingBox = styled.View`
  height: 200px;
`;

/** `contentContainerStyle` takes a style object, not a component. */
export const { matchScroll } = StyleSheet.create({
  matchScroll: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
});

export const MatchWordmark = styled(Image)`
  height: 50px;
  width: 100%;
`;

export const MatchCaption = styled(Text)`
  text-align: center;
  margin-top: 12px;
  max-width: 200px;
`;

export const Confetti = styled(AnimatedLottieView)`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
`;
