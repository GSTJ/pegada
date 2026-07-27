import * as React from "react";
import { View } from "react-native";

import { router } from "expo-router";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";

import { Button } from "@/components/Button";
import { SceneName } from "@/types/scene-name";
import { EmptyAnimation } from "@/views/(tabs)/Swipe/components/SwipeRequestFeedback/styles";

import { EmptyDescription, EmptyRoot, EmptyTitle } from "../styles";

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
  const theme = useTheme();

  return (
    <EmptyRoot style={{ paddingTop: insets.top + theme.spacing[12] }}>
      <EmptyAnimation />
      <View>
        <EmptyTitle fontWeight="semibold">
          {t("messages.empty.title")}
        </EmptyTitle>
        <EmptyDescription fontSize="xs">
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
    </EmptyRoot>
  );
};
