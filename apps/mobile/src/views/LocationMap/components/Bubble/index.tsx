import * as React from "react";
import Animated from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import {
  Container,
  Content,
  Description,
  Rect,
  Row,
  Swipe,
  Title
} from "./styles";

export const Bubble: React.FC<React.ComponentProps<typeof Animated.View>> = (
  props
) => {
  const { t } = useTranslation();

  return (
    <Container {...props}>
      <Row>
        <Content>
          <Title>{t("locationMap.areYouHere")}</Title>
          <Description>{t("locationMap.adjustYourPosition")}</Description>
        </Content>
        <Swipe />
      </Row>
      <Rect />
    </Container>
  );
};
