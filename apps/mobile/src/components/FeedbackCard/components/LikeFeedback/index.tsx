import * as React from "react";
import { Image } from "react-native";

import { Container } from "./styles";

const LikeFeedback: React.FC = () => {
  return (
    <Container>
      <Image source={require("@/assets/images/HeartEyesEmoji.webp")} />
    </Container>
  );
};

export default LikeFeedback;
