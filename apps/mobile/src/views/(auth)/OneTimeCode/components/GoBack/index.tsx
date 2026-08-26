import * as React from "react";

import { useUnistyles } from "react-native-unistyles";

import BackArrow from "@/assets/images/BackArrow.svg";

import { Container } from "./styles";

const GoBack: React.FC<React.ComponentProps<typeof Container>> = (props) => {
  const { theme } = useUnistyles();

  return (
    <Container {...props}>
      <BackArrow fill={theme.colors.text} />
    </Container>
  );
};

export default GoBack;
