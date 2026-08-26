import type { LottieViewProps } from "lottie-react-native";

import LottieView from "lottie-react-native";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

/** Lottie is not autoprocessed, so the sheet reaches it wrapped. */
const ThemedLottieView = withUnistyles(LottieView);

type LoadingProps = {
  inverse?: boolean;
} & Omit<LottieViewProps, "source"> &
  Partial<Pick<LottieViewProps, "source">>;

/**
 * The dots the whole app spins on. `.attrs` spread `...props` last, so a
 * caller always won over the defaults — hence `autoPlay` before the spread and
 * `source` only filling in when the caller left it out.
 */
const Loading = ({ inverse, source, style, ...props }: LoadingProps) => (
  <ThemedLottieView
    autoPlay
    {...props}
    source={
      source ??
      (inverse
        ? require("@/assets/animations/inverseLoadingDots.json")
        : require("@/assets/animations/primaryLoadingDots.json"))
    }
    style={[styles.loading, style]}
  />
);

export default Loading;

const styles = StyleSheet.create({
  loading: {
    width: 50,
    height: 20,
    marginTop: "auto",
    marginRight: "auto",
    marginBottom: "auto",
    marginLeft: "auto",
  },
});
