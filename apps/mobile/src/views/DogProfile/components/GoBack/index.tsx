import * as React from "react";

import { useUnistyles } from "react-native-unistyles";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import Glassmorphism from "@/components/Glassmorphism";

import { Container, Content } from "./styles";

const GoBack = (props: React.ComponentProps<typeof Container>) => {
  const { theme } = useUnistyles();

  return (
    <Container {...props}>
      <Glassmorphism>
        <Content>
          <ArrowDown fill={theme.colors.primary} />
        </Content>
      </Glassmorphism>
    </Container>
  );
};

export default GoBack;
