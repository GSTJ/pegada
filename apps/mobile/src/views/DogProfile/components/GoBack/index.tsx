import * as React from "react";
import { useTheme } from "styled-components/native";

import ArrowDown from "@/assets/images/ArrowDown.svg";
import { PressableArea } from "@/components/PressableArea";
import { Container, Content } from "./styles";

const HIT_SLOP = {
  top: 15,
  bottom: 15,
  left: 15,
  right: 15,
};

const GoBack = (props: React.ComponentProps<typeof Container>) => {
  const theme = useTheme();

  return (
    <Container {...props}>
      <PressableArea pointerEvents="box-only" hitSlop={HIT_SLOP}>
        <Content>
          <ArrowDown fill={theme.colors.primary} />
        </Content>
      </PressableArea>
    </Container>
  );
};

export default GoBack;
