import LottieView from "lottie-react-native";
import styled from "styled-components/native";

interface LoadingProps {
  inverse?: boolean;
}

export default styled(LottieView).attrs<LoadingProps>((props) => ({
  autoPlay: true,
  source: props.inverse
    ? require("@/assets/animations/inverseLoadingDots.json")
    : require("@/assets/animations/primaryLoadingDots.json"),
  ...props
}))`
  width: 50px;
  height: 20px;
  margin: auto;
`;
