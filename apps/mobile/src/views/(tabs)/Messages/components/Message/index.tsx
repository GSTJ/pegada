import type { Match } from "../..";

import * as React from "react";
import { View } from "react-native";

import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";

import { Fill } from "@/components/layout";
import { ThinkingEmoji } from "@/components/MatchActionBar/styles";
import { Text } from "@/components/text";
import { SceneName } from "@/types/scene-name";
import { Swipe } from "@/views/(tabs)/Swipe/components/SwipeHandler/hooks/use-swipe-gesture";

import { Container, emojiSize, EmojiContainer, Picture } from "./styles";

const getEmojiBySwipeType = (swipeType?: Swipe) => {
  switch (swipeType) {
    case Swipe.Maybe:
      return ThinkingEmoji;
    default:
      return null;
  }
};

type MessageProps = {
  item: Match;
};

export const Message: React.FC<MessageProps> = ({ item }) => {
  const router = useRouter();
  const { t } = useTranslation();

  const Emoji = getEmojiBySwipeType(
    // TODO: Return this when we get swipeType back
    undefined, // item.interest?.swipeType
  );

  return (
    <Container
      testID="messages-chat-row"
      onPress={() =>
        router.push({
          pathname: `${SceneName.Chat}/[matchId]`,
          params: { dogId: item.dog.id, matchId: item.id },
        })
      }
    >
      <View>
        <Picture
          source={{
            uri: item.dog.images[0]?.url,
            blurhash: item.dog.images[0]?.blurhash ?? undefined,
          }}
        />
        {Emoji ? (
          <EmojiContainer>
            <Emoji style={emojiSize} />
          </EmojiContainer>
        ) : null}
      </View>
      <Fill>
        <Text fontWeight="semibold" numberOfLines={1}>
          {item.dog.name}
        </Text>
        <Text fontSize="xs" numberOfLines={2}>
          {item.lastMessage?.content ?? t("matches.sendFirstMessage")}
        </Text>
      </Fill>
    </Container>
  );
};
