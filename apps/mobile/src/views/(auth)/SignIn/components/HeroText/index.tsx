import * as React from "react";
import { Trans } from "react-i18next";

import {
  Container,
  FlexRowView,
  Line,
  RotatedRectangle,
  Title,
  UnderlineContainer,
  WhiteTitle
} from "./styles";

export const Underline: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <UnderlineContainer>
    <Line />
    {children}
  </UnderlineContainer>
);

export const RectangleHighLight: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => (
  <UnderlineContainer>
    <RotatedRectangle />
    <WhiteTitle>{children}</WhiteTitle>
  </UnderlineContainer>
);

const HeroText: React.FC = () => {
  return (
    <Container>
      <Trans
        i18nKey="insertEmail.findDogsNearYou"
        components={{
          view: <FlexRowView />,
          title: <Title />,
          highlight: <RectangleHighLight />
        }}
      />
    </Container>
  );
};

export default HeroText;
