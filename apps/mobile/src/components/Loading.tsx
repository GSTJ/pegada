import * as React from "react";
import LottieView from "lottie-react-native";
import styled from "styled-components/native";

// Internal styled component that only takes the original LottieView props.
// Note: not exported to keep its stricter API internal.
const _Loading = styled(LottieView)`
  width: 50px;
  height: 20px;
  margin: auto;
`;

export interface LoadingProps
  extends Omit<React.ComponentProps<typeof _Loading>, "source"> {
  /**
   * When true, uses the inverse coloured animation instead of the primary one.
   */
  inverse?: boolean;
}

/**
 * Loading indicator that wraps the base LottieView ensuring the mandatory
 * `source` prop is always provided, so callers don't need to specify it.
 *
 * We intentionally hide the `source` prop from the public interface because
 * the component decides which animation file to use based on the `inverse`
 * flag. This fixes the TypeScript error where the required `source` prop was
 * considered missing in places that render <Loading />.
 */
const Loading: React.FC<LoadingProps> = ({ inverse = false, ...rest }) => {
  const source = inverse
    ? require("@/assets/animations/inverseLoadingDots.json")
    : require("@/assets/animations/primaryLoadingDots.json");

  return <_Loading autoPlay source={source} {...rest} />;
};

export default Loading;
