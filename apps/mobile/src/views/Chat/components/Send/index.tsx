import { useState } from "react";

import { useTranslation } from "react-i18next";

import { useKeyboardAwareSafeAreaInsets } from "@/hooks/use-keyboard-aware-safe-area-insets";

import { useSendMessage } from "../../hooks/use-send-message";
import { Container, Input, styles } from "./styles";

export const SEND_HEIGHT = 65;

const Send = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();

  const insets = useKeyboardAwareSafeAreaInsets();

  const handleSubmit = () => {
    if (!message.trim()) return;

    void sendMessage(message);
    setMessage("");
  };

  return (
    <Container
      style={[
        styles.container,
        {
          height: SEND_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <Input
        testID="chat-input"
        value={message}
        onChangeText={setMessage}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        autoCapitalize="none"
        enablesReturnKeyAutomatically
        blurOnSubmit={false}
        placeholder={t("send.placeholder")}
        style={styles.input}
      />
    </Container>
  );
};

export default Send;
