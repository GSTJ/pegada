import * as React from "react";
import { useTheme } from "styled-components/native";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import Glassmorphism from "@/components/Glassmorphism";
import { Container, Content } from "./styles";

const GoBack = (props: React.ComponentProps<typeof Container>) => {
  const theme = useTheme();

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
