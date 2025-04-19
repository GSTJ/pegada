import * as React from "react";
import { useMagicModal } from "react-native-magic-modal";
import { useTranslation } from "react-i18next";

import { Container, Description, OkButton, Title } from "./styles";

interface DefaultModalProps {
  title: string;
  description: string;
}

export const DefaultModal: React.FC<DefaultModalProps> = ({
  title,
  description
}) => {
  const { t } = useTranslation();
  const { hide } = useMagicModal();

  return (
    <Container>
      <Title>{title}</Title>
      <Description>{description}</Description>
      <OkButton onPress={() => hide()}>{t("common.ok")}</OkButton>
    </Container>
  );
};
