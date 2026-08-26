import type { RouterOutputs } from "@/contexts/trpc-provider";

import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, View, KeyboardAvoidingView } from "react-native";

import { usePathname } from "expo-router";

import { useScrollToTop } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Divider from "@/components/divider";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/text";
import { getTrcpContext } from "@/contexts/trcp-context";
import { api } from "@/contexts/trpc-provider";
import { handleRequestAppReview } from "@/services/app-review";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";
import { Header } from "@/views/(tabs)/Messages/components/Header";
import { Message } from "@/views/(tabs)/Messages/components/Message";

import { EmptyMessages } from "./components/empty-messages";
import { SearchBar } from "./components/SearchBar";
import { styles } from "./styles";

export type Match = RouterOutputs["match"]["getAll"][number];

const MemoizedDivider = () => (
  <View style={styles.dividerContainer}>
    <Divider />
  </View>
);

const getKeyMemoized = (item: Match) => `${item.id}_message`;

const Messages = () => {
  const pathname = usePathname();
  const { t } = useTranslation();

  const scrollRef = useRef<FlatList<Match>>(null);
  useScrollToTop(scrollRef);

  const [matches] = api.match.getAll.useSuspenseQuery(undefined, {
    refetchInterval: pathname === SceneName.Messages ? 5000 : false,
  });

  useEffect(() => {
    if (matches.length > 0) {
      // If the user has matches, we request the app review
      handleRequestAppReview().catch(sendError);
    }

    for (const { dog } of matches) {
      getTrcpContext().dog.get.setData({ id: dog.id }, dog);
    }
  }, [matches]);

  const [search, setSearch] = useState("");

  const data = (() => {
    const getFiltered = () => {
      if (!search) return matches;

      return matches.filter((match) => {
        const { dog } = match;
        return dog.name.toLowerCase().includes(search.toLowerCase());
      });
    };

    const filteredMatches = getFiltered();

    if (filteredMatches.length === 0) return [];

    // Most recent messages come first. Sort a copy: with no search term
    // getFiltered hands back the query's own array, and sorting in place
    // reorders the cached data under everything else reading it.
    const sortedMatches = [...filteredMatches].sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;

      if (a.lastMessage?.createdAt < b.lastMessage?.createdAt) return 1;
      if (a.lastMessage?.createdAt > b.lastMessage?.createdAt) return -1;
      return 0;
    });

    return sortedMatches;
  })();

  const { theme } = useUnistyles();

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
          paddingBottom: theme.spacing[4],
        }}
      >
        <View style={styles.title}>
          <Text fontWeight="bold">{t("matches.matchedDogs")}</Text>
        </View>
        <Header matches={data} />
      </View>
      <View
        style={{
          marginTop: theme.spacing[3],
          marginBottom: theme.spacing[1],
        }}
      >
        <View style={styles.title}>
          <Text fontWeight="bold">{t("matches.messages")}</Text>
        </View>
      </View>
    </>
  );

  const MemoizedEmptyMessages = (
    <EmptyMessages search={search} setSearch={setSearch} />
  );

  // Grow the container only when the list is empty, so the empty state fills
  // the screen. Doing it unconditionally breaks the populated list's layout.
  const emptyListGrow = data?.length ? undefined : 1;

  return (
    <KeyboardAvoidingView
      testID="messages-screen"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
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
          borderColor: theme.colors.border,
        }}
        contentContainerStyle={{
          paddingBottom: theme.spacing[4],
          paddingTop: theme.spacing[1],
          flexGrow: emptyListGrow,
        }}
      />
    </KeyboardAvoidingView>
  );
};

const MessagesScreen = () => {
  return (
    <NetworkBoundary>
      <Messages />
    </NetworkBoundary>
  );
};

export default MessagesScreen;
