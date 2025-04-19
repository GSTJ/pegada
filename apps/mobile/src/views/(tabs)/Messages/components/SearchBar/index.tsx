import * as React from "react";

import { Text } from "@/components/Text";
import { Container, SearchFieldContainer, TextField } from "./styles";

export const SearchBar: React.FC<React.ComponentProps<typeof TextField>> = (
  props
) => {
  return (
    <Container edges={["top"]}>
      <SearchFieldContainer>
        <Text fontSize="xxs">🔍</Text>

        <TextField
          autoCorrect={false}
          autoCapitalize="none"
          placeholder="Search"
          autoComplete="off"
          {...props}
        />
      </SearchFieldContainer>
    </Container>
  );
};
