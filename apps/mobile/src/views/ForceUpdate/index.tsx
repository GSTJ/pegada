import * as React from "react";
import { Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import Logo from "@/assets/images/Logo";
import { BottomAction } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { sendError } from "@/services/errorTracking";
import { CenterText, Container } from "./styles";

const ForceUpdate: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Container>
      <Logo
        style={{ marginBottom: theme.spacing[4] }}
        width={55}
        height={55}
        fill={theme.colors.primary}
      />
      <CenterText fontWeight="bold" fontSize="lg">
        {t("forceUpdate.title")}
      </CenterText>
      <CenterText fontSize="md">{t("forceUpdate.description")}</CenterText>
      <BottomAction.Container>
        <Button
          onPress={() => {
            // Store automatically redirects to the app store or play store
            Linking.openURL(`${APP_SHARE_LINK_BASE}/store`).catch(sendError);
          }}
        >
          {t("forceUpdate.button")}
        </Button>
      </BottomAction.Container>
    </Container>
  );
};

export default ForceUpdate;
