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

  const MessageLoader = hasNextPage ? (
    <ActivityIndicator color={theme.colors.text} />
  ) : null;

  const FooterComponent = messages ? MessageLoader : null;

  const topPadding = insets.top + HEADER_HEIGHT + theme.spacing[3];
  const bottomPadding = insets.bottom + SEND_HEIGHT + theme.spacing[3];

  const inverted = !!messages?.length;

  const contentContainerStyle = {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingBottom: inverted ? topPadding : bottomPadding,
    paddingTop: inverted ? bottomPadding : topPadding
  };

  const ListEmptyComponent = () => <Empty />;

  const renderItem = ({
    item,
    index
  }: {
    item: MessageProps;
    index: number;
  }) => {
    // Don't show the date if it's the first message or if it's loading
    const showNextDay = index !== messages.length - 1 || !hasNextPage;

    return (
      <>
        {showNextDay ? (
          <NextDay message={item} nextMessage={messages?.[index + 1]} />
        ) : null}
        <Message {...item} self={item.senderId !== dogId}>
          {item.content}
        </Message>
      </>
    );
  };

  return (
    <FlashList
      contentContainerStyle={contentContainerStyle}
      estimatedItemSize={77}
      inverted={inverted}
      data={messages}
      keyExtractor={keyExtractor}
      ListFooterComponent={FooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      renderItem={renderItem}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
    />
  );
};

const Chat = () => {
  const theme = useTheme();

  return (
    <Container behavior={Platform.OS === "ios" ? "padding" : undefined}>
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
