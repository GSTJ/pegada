import * as React from "react";
import { BlurViewProps } from "expo-blur";

import { Container, Gradient } from "./styles";

const Glassmorphism: React.FC<BlurViewProps> = ({ children, ...props }) => {
  return (
    <Container {...props}>
      <Gradient>{children}</Gradient>
    </Container>
  );
};

export default Glassmorphism;
