import AnimatedLottieView from "lottie-react-native";

export const ConfettiAnimation = () => (
  <AnimatedLottieView
    source={require("@/assets/animations/confetti.json")}
    autoPlay
    loop={false}
    style={{ position: "absolute", width: "100%", height: "100%", top: 0 }}
    resizeMode="cover"
  />
);
