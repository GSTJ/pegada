import * as React from "react";
import { useTheme } from "styled-components/native";

import BackArrow from "@/assets/images/BackArrow.svg";
import { Container } from "./styles";

const GoBack: React.FC<React.ComponentProps<typeof Container>> = (props) => {
  const theme = useTheme();

  return (
    <Container {...props}>
      <BackArrow fill={theme.colors.text} />
    </Container>
  );
};

export default GoBack;
