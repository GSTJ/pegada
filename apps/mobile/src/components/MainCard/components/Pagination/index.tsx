import * as React from "react";
import { useAnimatedStyle, withTiming } from "react-native-reanimated";

import { Container, Content, Dot } from "./styles";

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
          <DotComponent
            key={`${index}-dot`}
            index={index}
            currentPage={currentPage}
          />
        ))}
      </Content>
    </Container>
  );
};

export default Pagination;
