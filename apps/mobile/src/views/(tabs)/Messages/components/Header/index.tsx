import * as React from "react";
import { FlatList, View } from "react-native";
import { useTheme } from "styled-components/native";

import { Match } from "../..";
import { Preview } from "../Preview";
import { Container } from "./styles";

interface HeaderProps {
  matches?: Match[];
}

export const Header: React.FC<HeaderProps> = ({ matches }) => {
  const theme = useTheme();

  if (!matches?.length) return null;

  return (
    <Container>
      <FlatList
        data={matches}
        keyExtractor={(message) => `${String(message.id)}_preview`}
        renderItem={({ item }) => <Preview item={item} />}
        horizontal
        contentContainerStyle={{
          paddingHorizontal: theme.spacing[4]
        }}
        ItemSeparatorComponent={() => (
          <View style={{ width: theme.spacing[3] }} />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </Container>
  );
};
