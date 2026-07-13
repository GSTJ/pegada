import * as React from "react";
import { BlurViewProps } from "expo-blur";
import { useIsFocused } from "@react-navigation/native";

import { isLiquidGlassAvailableSafe } from "@/components/BlurView";

import { Container, Gradient } from "./styles";

const Glassmorphism: React.FC<BlurViewProps> = ({ children, ...props }) => {
  const isFocused = useIsFocused();

  if (isFocused && isLiquidGlassAvailableSafe()) {
    return <Container {...props}>{children}</Container>;
  }

  return (
    <Container {...props}>
      <Gradient>{children}</Gradient>
    </Container>
  );
};

export default Glassmorphism;
