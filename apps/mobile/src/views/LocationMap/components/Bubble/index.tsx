import * as React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import Animated from "react-native-reanimated";

import { Description, Swipe, Title, styles } from "./styles";

export const Bubble: React.FC<React.ComponentProps<typeof Animated.View>> = (
  props,
) => {
  const { t } = useTranslation();

  return (
    <Animated.View {...props} style={[styles.container, props.style]}>
      <View style={styles.row}>
        <View style={styles.content}>
          <Title style={styles.title} fontWeight="bold" fontSize="sm">
            {t("locationMap.areYouHere")}
          </Title>
          <Description style={styles.description} fontSize="sm">
            {t("locationMap.adjustYourPosition")}
          </Description>
        </View>
        <Swipe
          style={styles.swipe}
          resizeMode="cover"
          autoPlay
          source={require("@/assets/animations/swipe.json")}
        />
      </View>
      <View style={styles.rect} />
    </Animated.View>
  );
};
