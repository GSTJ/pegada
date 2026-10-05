import * as React from "react";
import type { View } from "react-native";
import styled, { useTheme } from "styled-components/native";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import Glassmorphism from "@/components/Glassmorphism";
import { Container, Content } from "./styles";

export type GoBackRef = View;

interface GoBackProps extends React.ComponentPropsWithoutRef<typeof Container> {
  visualOnly?: boolean;
}

const VisualOnlyContainer = styled(Container).attrs({
  pointerEvents: "none",
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
})``;

const GoBack = React.forwardRef<GoBackRef, GoBackProps>(({ visualOnly = false, ...props }, ref) => {
  const theme = useTheme();
  const RenderContainer = visualOnly ? VisualOnlyContainer : Container;

  return (
    <RenderContainer ref={ref} {...props}>
      <Glassmorphism>
        <Content>
          <ArrowDown fill={theme.colors.primary} />
        </Content>
      </Glassmorphism>
    </RenderContainer>
  );
});

GoBack.displayName = "GoBack";

export default GoBack;
