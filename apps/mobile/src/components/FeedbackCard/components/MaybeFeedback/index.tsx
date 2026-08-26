import * as React from "react";
import { Image } from "react-native";

import { Container, styles } from "./styles";

const MaybeFeedback: React.FC = () => {
  return (
    <Container style={styles.container}>
      <Image source={require("@/assets/images/ThinkingEmoji.webp")} />
    </Container>
  );
};

export default MaybeFeedback;
