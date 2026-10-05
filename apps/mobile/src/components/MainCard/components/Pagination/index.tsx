import * as React from "react";
import {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useReduceMotion } from "@/hooks/useReduceMotion";
import { Container, Content, Dot } from "./styles";

const DotComponent: React.FC<{
  index: number;
  currentPage: number;
}> = ({ index, currentPage }) => {
  const active = index === currentPage;
  const reduceMotion = useReduceMotion();
  const size = useSharedValue(active ? 8 : 6);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    const target = active ? 8 : 6;
    if (!mounted.current || reduceMotion) {
      cancelAnimation(size);
      size.value = target;
      mounted.current = true;
      return;
    }
    size.value = withTiming(target, { duration: 200 });
  }, [active, reduceMotion, size]);

  const style = useAnimatedStyle(() => ({ width: size.value, height: size.value }));

  return <Dot key={index} active={active} style={style} />;
};

interface PaginationProps {
  pages: number;
  currentPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ pages, currentPage }) => {
  if (pages <= 1) return null;

  return (
    <Container>
      <Content>
        {Array.from({ length: pages }).map((_, index) => (
          <DotComponent key={`${index}-dot`} index={index} currentPage={currentPage} />
        ))}
      </Content>
    </Container>
  );
};

export default Pagination;
