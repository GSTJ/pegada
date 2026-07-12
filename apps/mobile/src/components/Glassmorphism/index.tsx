import * as React from "react";
import { BlurViewProps } from "expo-blur";

import { isLiquidGlassAvailableSafe } from "@/components/BlurView";
import { Container, Gradient } from "./styles";

/**
 * Frosted surface for chrome over content. On iOS 26+ this is native Liquid
 * Glass via shared `BlurView`; elsewhere it keeps the blur + card gradient.
 */
const Glassmorphism: React.FC<BlurViewProps> = ({ children, ...props }) => {
  if (isLiquidGlassAvailableSafe()) {
    return <Container {...props}>{children}</Container>;
  }

  return (
    <Container {...props}>
      <Gradient>{children}</Gradient>
    </Container>
  );
};

export default Glassmorphism;
