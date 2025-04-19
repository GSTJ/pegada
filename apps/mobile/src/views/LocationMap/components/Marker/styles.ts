import Animated from "react-native-reanimated";
import styled from "styled-components/native";

import ShadowIcon from "@/assets/images/Shadow.svg";

export const Container = styled.View.attrs({ pointerEvents: "none" })`
  position: absolute;
  justify-content: center;
  align-items: center;
  top: 0;
  bottom: 0;
  right: 0;
  left: 0;
`;

export const Content = styled.View`
  top: -20px;
  align-items: center;
`;

export const Shadow = styled(ShadowIcon)`
  bottom: -38px;
  left: 0;
  right: 0;
  align-self: center;
`;

export const MarkerWrapper = styled(Animated.View)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;
