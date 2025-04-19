import * as React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { SceneName } from "@/types/SceneName";
import { EmptyAnimation } from "@/views/(tabs)/Swipe/components/SwipeRequestFeedback/styles";

interface EmptyMessagesProps {
  search: string;
  setSearch: (value: string) => void;
}

export const EmptyMessages: React.FC<EmptyMessagesProps> = ({
  search,
  setSearch
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexGrow: 1,
        paddingHorizontal: theme.spacing[12],
        paddingBottom: theme.spacing[12],
        paddingTop: insets.top + theme.spacing[12]
      }}
    >
      <EmptyAnimation />
      <View>
        <Text
          fontWeight="semibold"
          style={{
            marginTop: 12,
            marginBottom: 10,
            textAlign: "center"
          }}
        >
          {t("messages.empty.title")}
        </Text>
        <Text
          fontSize="xs"
          style={{
            letterSpacing: 0.5,
            textAlign: "center",
            marginBottom: 30
          }}
        >
          {t("messages.empty.description")}
        </Text>
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
