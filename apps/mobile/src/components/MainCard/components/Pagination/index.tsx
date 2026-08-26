import * as React from "react";
import { View } from "react-native";

import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { Container, styles } from "./styles";

const DotComponent: React.FC<{
  index: number;
  currentPage: number;
}> = ({ index, currentPage }) => {
  const active = index === currentPage;

  const style = useAnimatedStyle(() => {
    "worklet";
    const size = withTiming(active ? 8 : 6, { duration: 200 });
    return { width: size, height: size };
  });
  styles.useVariants({ active });

  return <Animated.View key={index} style={[styles.dot, style]} />;
};

type PaginationProps = {
  pages: number;
  currentPage: number;
};

const Pagination: React.FC<PaginationProps> = ({ pages, currentPage }) => {
  if (pages <= 1) return null;

  return (
    <Container style={styles.container}>
      <View style={styles.content}>
        {Array.from({ length: pages }).map((_, index) => (
          <DotComponent
            // oxlint-disable-next-line react/no-array-index-key -- dots are positional; there is no other identity to key on
            key={`${index}-dot`}
            index={index}
            currentPage={currentPage}
          />
        ))}
      </View>
    </Container>
  );
};

export default Pagination;
