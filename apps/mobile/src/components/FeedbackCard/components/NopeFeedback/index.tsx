import * as React from "react";
import { Image } from "react-native";

import { Container } from "./styles";

const NopeFeedback: React.FC = () => {
  return (
    <Container>
      <Image source={require("@/assets/images/ConfusedEmoji.webp")} />
    </Container>
  );
};

export default NopeFeedback;
