import { Confetti, styles } from "./styles";

export const ConfettiAnimation = () => (
  <Confetti
    style={styles.confetti}
    source={require("@/assets/animations/confetti.json")}
    autoPlay
    loop={false}
    resizeMode="cover"
  />
);
