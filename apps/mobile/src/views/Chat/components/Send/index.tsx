import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useKeyboardAwareSafeAreaInsets } from "@/hooks/useKeyboardAwareSafeAreaInsets";
import { useSendMessage } from "../../hooks/useSendMessage";
import { Container, Input } from "./styles";

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
      style={{
        height: SEND_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom
      }}
    >
      <Input
        value={message}
        onChangeText={setMessage}
        onSubmitEditing={handleSubmit}
        returnKeyType="send"
        autoCapitalize="none"
        enablesReturnKeyAutomatically
        blurOnSubmit={false}
        placeholder={t("send.placeholder")}
      />
    </Container>
  );
};

export default Send;
