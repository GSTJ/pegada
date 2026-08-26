import * as React from "react";
import { View } from "react-native";

import { router } from "expo-router";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { SceneName } from "@/types/scene-name";
import {
  EmptyAnimation,
  styles as swipeRequestFeedbackStyles,
} from "@/views/(tabs)/Swipe/components/SwipeRequestFeedback/styles";

import { EmptyDescription, EmptyTitle, styles } from "../styles";

type EmptyMessagesProps = {
  search: string;
  setSearch: (value: string) => void;
};

export const EmptyMessages: React.FC<EmptyMessagesProps> = ({
  search,
  setSearch,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <View
      style={[styles.emptyRoot, { paddingTop: insets.top + theme.spacing[12] }]}
    >
      <EmptyAnimation
        style={swipeRequestFeedbackStyles.emptyAnimation}
        autoPlay
        source={require("@/assets/animations/empty.json")}
      />
      <View>
        <EmptyTitle fontWeight="semibold" style={styles.emptyTitle}>
          {t("messages.empty.title")}
        </EmptyTitle>
        <EmptyDescription fontSize="xs" style={styles.emptyDescription}>
          {t("messages.empty.description")}
        </EmptyDescription>
      </View>
      {search ? (
        <Button variant="outline" onPress={() => setSearch("")}>
          {t("messages.empty.clearSearch")}
        </Button>
      ) : (
        <Button variant="outline" onPress={() => router.push(SceneName.Swipe)}>
          {t("messages.empty.searchForDogs")}
        </Button>
      )}
    </View>
  );
};
