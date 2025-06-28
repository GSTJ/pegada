import type { BlurViewProps } from "expo-blur";
import * as React from "react";
import { useTheme } from "styled-components/native";

import { Container, getGradientProps, Gradient } from "./styles";

const Glassmorphism: React.FC<BlurViewProps> = ({ children, ...props }) => {
  const theme = useTheme();
  const gradientProps = getGradientProps({ theme });
  return (
    <Container {...props}>
      <Gradient {...gradientProps}>{children}</Gradient>
    </Container>
  );
};

export default Glassmorphism;
