import * as React from "react";
import { Linking } from "react-native";

import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { BottomAction } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { sendError } from "@/services/error-tracking";

import { CenterText, Container, styles } from "./styles";

const ForceUpdate: React.FC = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();

  return (
    <Container testID="force-update-screen" style={styles.container}>
      <Logo
        style={{ marginBottom: theme.spacing[4] }}
        width={55}
        height={55}
        fill={theme.colors.primary}
      />
      <CenterText
        testID="force-update-title"
        fontWeight="bold"
        fontSize="lg"
        style={styles.centerText}
      >
        {t("forceUpdate.title")}
      </CenterText>
      <CenterText fontSize="md" style={styles.centerText}>
        {t("forceUpdate.description")}
      </CenterText>
      <BottomAction.Container>
        <Button
          testID="force-update-button"
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
