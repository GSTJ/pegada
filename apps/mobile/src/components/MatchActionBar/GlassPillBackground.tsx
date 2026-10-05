import * as React from "react";
import styled from "styled-components/native";

import { LiquidGlassView } from "@/components/BlurView";

const StyledGlassView = styled(LiquidGlassView)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 999px;
`;

interface GlassPillBackgroundProps {
  tintColor: string;
  colorScheme: "light" | "dark";
}

/** Only rendered when the shared blur policy resolves to native glass. */
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
