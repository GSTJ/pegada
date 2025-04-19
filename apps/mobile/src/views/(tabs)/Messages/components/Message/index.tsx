import * as React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { ThinkingEmoji } from "@/components/MatchActionBar/styles";
import { Text } from "@/components/Text";
import { SceneName } from "@/types/SceneName";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/useSwipeGesture";
import { Match } from "../..";
import { Container, EmojiContainer, Picture } from "./styles";

const getEmojiBySwipeType = (swipeType?: Swipe) => {
  switch (swipeType) {
    case Swipe.Maybe:
      return ThinkingEmoji;
    default:
      return null;
  }
};

interface MessageProps {
  item: Match;
}

export const Message: React.FC<MessageProps> = ({ item }) => {
  const router = useRouter();
  const { t } = useTranslation();

  const Emoji = getEmojiBySwipeType(
    // TODO: Return this when we get swipeType back
    undefined // item.interest?.swipeType
  );

  return (
    <Container
      onPress={() =>
        router.push({
          pathname: `${SceneName.Chat}/[matchId]`,
          params: { dogId: item.dog.id, matchId: item.id }
        })
      }
    >
      <View>
        <Picture
          source={{
            uri: item.dog.images[0]?.url,
            blurhash: item.dog.images[0]?.blurhash ?? undefined
          }}
        />
        {Emoji ? (
          <EmojiContainer>
            <Emoji style={{ width: 15, height: 15 }} />
          </EmojiContainer>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text fontWeight="semibold" numberOfLines={1}>
          {item.dog.name}
        </Text>
        <Text fontSize="xs" numberOfLines={2}>
          {item.lastMessage?.content ?? t("matches.sendFirstMessage")}
        </Text>
      </View>
    </Container>
  );
};
