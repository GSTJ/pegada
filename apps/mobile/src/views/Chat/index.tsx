import type { MessageProps } from "./hooks/use-chat-pagination";

import { ActivityIndicator, ImageBackground, View } from "react-native";

import { useLocalSearchParams } from "expo-router";

import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/use-keyboard-aware-safe-area-insets";
import { useKeyboardOverlap } from "@/hooks/use-keyboard-aware-scroll";
import { Header, Message, NextDay, Send } from "@/views/Chat/components";

import { HEADER_HEIGHT } from "./components/Header";
import { SEND_HEIGHT } from "./components/Send";
import { useChatPagination } from "./hooks/use-chat-pagination";
import { CenteredText, CenteredView, styles } from "./styles";

const Empty = () => {
  const { t } = useTranslation();

  return (
    <CenteredView style={styles.centeredView}>
      <CenteredText fontWeight="bold" style={styles.centeredText}>
        {t("chat.youMatched")}
      </CenteredText>
      <CenteredText style={styles.centeredText}>
        {t("chat.sendAMessageToStart")}
      </CenteredText>
    </CenteredView>
  );
};

const keyExtractor = (message: MessageProps) => String(message.id);

// Hoisted: a component declared during render is a new type on every update,
// which remounts the empty state each time a message arrives.
const ListEmptyComponent = () => <Empty />;

const ChatMessageList = () => {
  const { dogId } = useLocalSearchParams();
  const { theme } = useUnistyles();

  const { messages, hasNextPage, loadMore } = useChatPagination();

  const insets = useKeyboardAwareSafeAreaInsets();

  const MessageLoader = hasNextPage ? (
    <ActivityIndicator color={theme.colors.text} />
  ) : null;

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

  const renderItem = ({
    item,
    index,
  }: {
    item: MessageProps;
    index: number;
  }) => {
    // Show the date separator above this message when the previous (older)
    // message is on a different day. Hide it for the very first item when
    // older pages may still load — we don't yet know if it's truly first.
    const previousMessage = messages?.[index - 1];
    const showNextDay = index !== 0 || !hasNextPage;

    return (
      <>
        {showNextDay ? (
          <NextDay message={item} nextMessage={previousMessage} />
        ) : null}
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
    // oxlint-disable-next-line typescript/no-explicit-any -- FlashList v2's prop types reject the union this list builds; the props are checked where they are assembled.
    <FlashList {...(flashListProps as any)} />
  );
};

const Chat = () => {
  const { theme } = useUnistyles();

  // The tiled background is a texture, not a surface: it has to sit further
  // back on dark than on light to read as the same weight.
  const patternOpacity = theme.dark ? 0.06 : 0.03;

  // The composer is `position: absolute; bottom: 0` inside the background
  // below, so the only thing that lifts it off the keyboard is this container
  // getting shorter. `KeyboardAvoidingView` did that on iOS and nothing at all
  // on Android, where `behavior` has to be left undefined — so the composer
  // stayed pinned to the bottom of the display, under the IME, and everything
  // typed into it was invisible.
  const keyboardOverlap = useKeyboardOverlap();

  return (
    <View
      testID="chat-screen"
      style={[styles.container, { paddingBottom: keyboardOverlap }]}
    >
      <ImageBackground
        source={
          theme.dark
            ? require("@/assets/images/background-dark.webp")
            : require("@/assets/images/background-light.webp")
        }
        imageStyle={{ opacity: patternOpacity }}
        resizeMode="repeat"
        style={styles.background} // Tiling pattern
      >
        <NetworkBoundary>
          <ChatMessageList />
        </NetworkBoundary>
        <Send />
        <Header />
      </ImageBackground>
    </View>
  );
};

export default Chat;
