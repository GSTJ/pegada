import type { MessageProps } from "./hooks/use-chat-pagination";

import { useEffect } from "react";
import { ActivityIndicator, ImageBackground, View } from "react-native";

import { useLocalSearchParams } from "expo-router";

import { FlashList } from "@shopify/flash-list";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import { NetworkBoundary } from "@/components/NetworkBoundary";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/use-keyboard-aware-safe-area-insets";
import { useKeyboardOverlap } from "@/hooks/use-keyboard-aware-scroll";
import { analytics } from "@/services/analytics";
import { Header, Message, NextDay, Send } from "@/views/Chat/components";

import { HEADER_HEIGHT } from "./components/Header";
import { SEND_HEIGHT } from "./components/Send";
import { useChatListAnchor } from "./hooks/use-chat-list-anchor";
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

const ChatMessageList = ({ keyboardOverlap }: { keyboardOverlap: number }) => {
  const { dogId } = useLocalSearchParams();
  const { theme } = useUnistyles();

  const { messages, hasNextPage, loadMore } = useChatPagination();

  const insets = useKeyboardAwareSafeAreaInsets();

  // The strip along the bottom of the screen the conversation cannot use —
  // `screenHeight - composerTop`. All three terms move together and not by the
  // same amount: the keyboard takes `keyboardOverlap` from the container, and
  // the composer gives back the bottom safe-area inset at the same time
  // (`useKeyboardAwareSafeAreaInsets` drops it while the IME is up, because
  // the home indicator is drawn over the keyboard). Anchoring on the sum is
  // what keeps a row's distance to the composer's top edge fixed; anchoring on
  // the keyboard alone slides the whole thread up by that inset — 34pt of
  // drift on this device, harmless but visible.
  const occludedBottom = keyboardOverlap + SEND_HEIGHT + insets.bottom;

  const { listRef, listProps } =
    useChatListAnchor<MessageProps>(occludedBottom);

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
    ...listProps,
    ref: listRef,
    contentContainerStyle,
    data: messages,
    keyExtractor,
    ListHeaderComponent: FooterComponent,
    ListEmptyComponent,
    renderItem,
    onStartReached: loadMore,
    onStartReachedThreshold: 0.5,
    // `startRenderingFromBottom` is what actually opens the conversation on
    // the newest message. Without it the list mounts at offset 0 — the OLDEST
    // message — and the only thing that ever moved it was
    // `autoscrollToBottomThreshold` happening to fire as rows measured and the
    // content grew past FlashList's estimate. That works on a cold open, where
    // react-query holds one 20-row page and offset 0 is close enough to the
    // end to be inside the threshold. Re-enter the same conversation and the
    // cache holds every page that was paginated in, the list mounts full
    // height, offset 0 is nowhere near the threshold, nothing fires, and the
    // chat opens on the first message ever sent. Measured before this line
    // existed: 12 of 12 warm opens landed on row 1 of 40.
    //
    // It sets `initialScrollIndex` to the last row, so the position is decided
    // by the layout manager on the first committed layout instead of by which
    // side of a growth heuristic the render happened to land on. The threshold
    // stays: it is what keeps the view pinned when a NEW message arrives while
    // you are already at the bottom.
    maintainVisibleContentPosition: {
      autoscrollToBottomThreshold: 0.2,
      startRenderingFromBottom: true,
    },
  };

  return (
    // oxlint-disable-next-line typescript/no-explicit-any -- FlashList v2's prop types reject the union this list builds; the props are checked where they are assembled.
    <FlashList {...(flashListProps as any)} />
  );
};

const Chat = () => {
  const { theme } = useUnistyles();
  const { matchId } = useLocalSearchParams();

  // Chat activation is the metric this feeds: how many matches ever get opened,
  // and how many of those ever get a message.
  useEffect(() => {
    analytics.track({
      event_type: "Chat Opened",
      event_properties: { match_id: String(matchId) },
    });
  }, [matchId]);

  // The tiled background is a texture, not a surface: it has to sit further
  // back on dark than on light to read as the same weight.
  const patternOpacity = theme.dark ? 0.06 : 0.03;

  // The composer is `position: absolute; bottom: 0` inside the background
  // below, so the only thing that lifts it off the keyboard is this container
  // getting shorter. `KeyboardAvoidingView` did that on iOS and nothing at all
  // on Android, where `behavior` has to be left undefined — so the composer
  // stayed pinned to the bottom of the display, under the IME, and everything
  // typed into it was invisible.
  //
  // The list needs the same number: shrinking the container takes the height
  // off the BOTTOM of its viewport, which is the edge the reader is on, so it
  // has to move its offset by the same amount to stay on the same message.
  // Read once and passed down rather than read again inside the list — the
  // hook drives `LayoutAnimation` from its listener, and two subscriptions
  // would configure the next animation twice.
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
          <ChatMessageList keyboardOverlap={keyboardOverlap} />
        </NetworkBoundary>
        <Send />
        <Header />
      </ImageBackground>
    </View>
  );
};

export default Chat;
