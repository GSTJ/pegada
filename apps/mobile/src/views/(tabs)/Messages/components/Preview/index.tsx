import type { SwipeDog } from "@/store/reducers/dogs/swipe";

import * as React from "react";

import { useRouter } from "expo-router";

import { Text } from "@/components/text";
import { SceneName } from "@/types/scene-name";

import { Container, Content, Picture } from "./styles";

type PreviewProps = {
  item: {
    id: string;
    dog: SwipeDog;
  };
};

export const Preview: React.FC<PreviewProps> = ({ item }) => {
  const router = useRouter();

  return (
    <Container
      onPress={() =>
        router.push({
          pathname: `${SceneName.Chat}/[matchId]`,
          params: { dogId: item.dog.id, matchId: item.id },
        })
      }
    >
      <Picture
        source={{
          uri: item.dog.images[0]?.url,
          blurhash: item.dog.images[0]?.blurhash ?? undefined,
        }}
      />
      <Content>
        <Text fontSize="xs" fontWeight="semibold" numberOfLines={1}>
          {item.dog.name}
        </Text>
      </Content>
    </Container>
  );
};
