import * as React from "react";
import { GlassView } from "expo-glass-effect";
import styled from "styled-components/native";

const StyledGlassView = styled(GlassView)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

interface GlassPillBackgroundProps {
  tintColor: string;
  colorScheme: "light" | "dark";
}

/**
 * Only ever rendered after the caller has checked `isLiquidGlassAvailableSafe()`.
 */
export const GlassPillBackground: React.FC<GlassPillBackgroundProps> = ({
  tintColor,
  colorScheme,
}) => (
  <StyledGlassView
    glassEffectStyle="regular"
    isInteractive
    tintColor={tintColor}
    colorScheme={colorScheme}
  />
);
