import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, View } from "react-native";
import { usePathname } from "expo-router";
import { useScrollToTop } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import Divider from "@/components/Divider";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/Text";
import { getTrcpContext } from "@/contexts/trcpContext";
import { api, RouterOutputs } from "@/contexts/TRPCProvider";
import { handleRequestAppReview } from "@/services/appReview";
import { sendError } from "@/services/errorTracking";
import { SceneName } from "@/types/SceneName";
import { Header } from "@/views/(tabs)/Messages/components/Header";
import { Message } from "@/views/(tabs)/Messages/components/Message";
import { EmptyMessages } from "./components/EmptyMessages";
import { SearchBar } from "./components/SearchBar";
import { Container, DividerContainer, Title } from "./styles";

export type Match = RouterOutputs["match"]["getAll"][number];

const MemoizedDivider = () => (
  <DividerContainer>
    <Divider />
  </DividerContainer>
);

const getKeyMemoized = (item: Match) => item.id + "_message";

const Messages = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const scrollRef = useRef<FlatList<Match>>(null);
  useScrollToTop(scrollRef);

  const [matches] = api.match.getAll.useSuspenseQuery(undefined, {
    refetchInterval: pathname === SceneName.Messages ? 5000 : false
  });

  useEffect(() => {
    if (matches.length > 0) {
      // If the user has matches, we request the app review
      handleRequestAppReview().catch(sendError);
    }

    matches.forEach((match) => {
      const dog = match.dog;
      getTrcpContext().dog.get.setData({ id: dog.id }, dog);
    });
  }, [matches]);

  const [search, setSearch] = useState("");

  const data = (() => {
    const getFiltered = () => {
      if (!search) return matches;

      return matches.filter((match) => {
        const dog = match.dog;
        return dog.name.toLowerCase().includes(search.toLowerCase());
      });
    };

    const filteredMatches = getFiltered();

    if (!filteredMatches.length) return [];

    // Most recent messages come first
    const sortedMatches = filteredMatches.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;

      if (a.lastMessage?.createdAt < b.lastMessage?.createdAt) return 1;
      if (a.lastMessage?.createdAt > b.lastMessage?.createdAt) return -1;
      return 0;
    });

    return sortedMatches;
  })();

  const theme = useTheme();

  // useCallback makes the header images re-render and flicker
  // useMemo is the right hook for this case, solving the issue
  const MemoizedHeader = (
    <>
      <View
        style={{
          marginTop: theme.spacing[2],
          gap: theme.spacing[3],
          borderBottomWidth: theme.stroke.sm,
          borderColor: theme.colors.border,
          paddingBottom: theme.spacing[4]
        }}
      >
        <Title>
          <Text fontWeight="bold">{t("matches.matchedDogs")}</Text>
        </Title>
        <Header matches={data} />
      </View>
      <View
        style={{
          marginTop: theme.spacing[3],
          marginBottom: theme.spacing[1]
        }}
      >
        <Title>
          <Text fontWeight="bold">{t("matches.messages")}</Text>
        </Title>
      </View>
    </>
  );

  const MemoizedEmptyMessages = (
    <EmptyMessages search={search} setSearch={setSearch} />
  );

  return (
    <Container behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {Boolean(matches?.length) && (
        <SearchBar value={search} onChangeText={setSearch} />
      )}
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={data}
        ref={scrollRef}
        keyExtractor={getKeyMemoized}
        ListHeaderComponent={data?.length ? MemoizedHeader : undefined}
        ItemSeparatorComponent={MemoizedDivider}
        renderItem={({ item }) => {
          return <Message item={item} />;
        }}
        ListEmptyComponent={MemoizedEmptyMessages}
        style={{
          borderBottomWidth: theme.stroke.sm,
          borderColor: theme.colors.border
        }}
        contentContainerStyle={{
          paddingBottom: theme.spacing[4],
          paddingTop: theme.spacing[1],
          // Increase size only if data is empty
          // Otherwise it bugs stuff
          flexGrow: data?.length ? undefined : 1
        }}
      />
    </Container>
  );
};

export default () => {
  return (
    <NetworkBoundary>
      <Messages />
    </NetworkBoundary>
  );
};
