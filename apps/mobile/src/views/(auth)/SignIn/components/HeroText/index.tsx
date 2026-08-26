import * as React from "react";
import { View } from "react-native";

import { Trans } from "react-i18next";

import { Title, WhiteTitle, styles } from "./styles";

export const Underline: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <View style={styles.underlineContainer}>
    <View style={styles.line} />
    {children}
  </View>
);

export const RectangleHighLight: React.FC<{
  children?: React.ReactNode;
}> = ({ children }) => (
  <View style={styles.underlineContainer}>
    <View style={styles.rotatedRectangle} />
    <WhiteTitle style={styles.whiteTitle} fontSize="xxl" fontWeight="bold">
      {children}
    </WhiteTitle>
  </View>
);

const HeroText: React.FC = () => {
  return (
    <View style={styles.container}>
      <Trans
        i18nKey="insertEmail.findDogsNearYou"
        components={{
          view: <View key="view" style={styles.flexRowView} />,
          title: (
            <Title
              key="title"
              style={styles.title}
              fontSize="xxl"
              fontWeight="bold"
            />
          ),
          highlight: <RectangleHighLight key="highlight" />,
        }}
      />
    </View>
  );
};

export default HeroText;
