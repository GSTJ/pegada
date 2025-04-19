import * as React from "react";
import { useRouter } from "expo-router";

import { Text } from "@/components/Text";
import { SwipeDog } from "@/store/reducers/dogs/swipe";
import { SceneName } from "@/types/SceneName";
import { Container, Content, Picture } from "./styles";

interface PreviewProps {
  item: {
    id: string;
    dog: SwipeDog;
  };
}

export const Preview: React.FC<PreviewProps> = ({ item }) => {
  const router = useRouter();

  return (
    <Container
      onPress={() =>
        router.push({
          pathname: `${SceneName.Chat}/[matchId]`,
          params: { dogId: item.dog.id, matchId: item.id }
        })
      }
    >
      <Picture
        source={{
          uri: item.dog.images[0]?.url,
          blurhash: item.dog.images[0]?.blurhash ?? undefined
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
