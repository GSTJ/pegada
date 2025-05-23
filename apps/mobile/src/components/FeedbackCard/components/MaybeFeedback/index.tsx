import * as React from "react";
import { Image } from "react-native";

import { Container } from "./styles";

const MaybeFeedback: React.FC = () => {
  return (
    <Container>
      <Image source={require("@/assets/images/ThinkingEmoji.webp")} />
    </Container>
  );
};

export default MaybeFeedback;
