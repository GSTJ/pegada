import { Confetti } from "./styles";

export const ConfettiAnimation = () => (
  <Confetti
    source={require("@/assets/animations/confetti.json")}
    autoPlay
    loop={false}
    resizeMode="cover"
  />
);
