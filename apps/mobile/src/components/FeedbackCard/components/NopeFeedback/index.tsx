import * as React from "react";
import { Image } from "react-native";

import { Container, styles } from "./styles";

const NopeFeedback: React.FC = () => {
  return (
    <Container style={styles.container}>
      <Image source={require("@/assets/images/ConfusedEmoji.webp")} />
    </Container>
  );
};

export default NopeFeedback;
