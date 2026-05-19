import { ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/useKeyboardAwareSafeAreaInsets";
import { Header, Message, NextDay, Send } from "@/views/Chat/components";
import { HEADER_HEIGHT } from "./components/Header";
import { SEND_HEIGHT } from "./components/Send";
import { MessageProps, useChatPagination } from "./hooks/useChatPagination";
import { Background, CenteredText, CenteredView, Container } from "./styles";

const Empty = () => {
  const { t } = useTranslation();

  return (
    <CenteredView>
      <CenteredText fontWeight="bold">{t("chat.youMatched")}</CenteredText>
      <CenteredText>{t("chat.sendAMessageToStart")}</CenteredText>
    </CenteredView>
  );
};

const keyExtractor = (message: MessageProps) => String(message.id);

const ChatMessageList = () => {
  const { dogId } = useLocalSearchParams();
  const theme = useTheme();

  const { messages, hasNextPage, loadMore } = useChatPagination();

  const insets = useKeyboardAwareSafeAreaInsets();

  const MessageLoader = hasNextPage ? <ActivityIndicator color={theme.colors.text} /> : null;

  const FooterComponent = messages ? MessageLoader : null;

  const topPadding = insets.top + HEADER_HEIGHT + theme.spacing[3];
  const bottomPadding = insets.bottom + SEND_HEIGHT + theme.spacing[3];

  // FlashList v2 dropped the `inverted` prop; the list now always renders
  // top-down. `useChatPagination` returns messages oldest→newest so the
  // newest message renders at the bottom (next to the Send composer) and
  // older history paginates by scrolling up (onStartReached).
  const contentContainerStyle = {
    paddingHorizontal: theme.spacing[3],
    paddingTop: topPadding,
    paddingBottom: bottomPadding,
  };

  const ListEmptyComponent = () => <Empty />;

  const renderItem = ({ item, index }: { item: MessageProps; index: number }) => {
    // Show the date separator above this message when the previous (older)
    // message is on a different day. Hide it for the very first item when
    // older pages may still load — we don't yet know if it's truly first.
    const previousMessage = messages?.[index - 1];
    const showNextDay = index !== 0 || !hasNextPage;

    return (
      <>
        {showNextDay ? <NextDay message={item} nextMessage={previousMessage} /> : null}
        <Message {...item} self={item.senderId !== dogId}>
          {item.content}
        </Message>
      </>
    );
  };

  // Older messages are at the top, so the loading spinner goes in the
  // header and pagination triggers via onStartReached.
  const flashListProps = {
    contentContainerStyle,
    data: messages,
    keyExtractor,
    ListHeaderComponent: FooterComponent,
    ListEmptyComponent,
    renderItem,
    onStartReached: loadMore,
    onStartReachedThreshold: 0.5,
    maintainVisibleContentPosition: { autoscrollToBottomThreshold: 0.2 },
  };

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <FlashList {...(flashListProps as any)} />
  );
};

const Chat = () => {
  const theme = useTheme();

  return (
    <Container testID="chat-screen" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Background
        source={
          theme.dark
            ? require("@/assets/images/background-dark.webp")
            : require("@/assets/images/background-light.webp")
        }
        imageStyle={{ opacity: theme.dark ? 0.06 : 0.03 }}
        resizeMode="repeat" // Tiling pattern
      >
        <NetworkBoundary>
          <ChatMessageList />
        </NetworkBoundary>
        <Send />
        <Header />
      </Background>
    </Container>
  );
};

export default Chat;
