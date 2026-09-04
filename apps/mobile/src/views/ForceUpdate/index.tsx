import * as React from "react";
import { Linking } from "react-native";

import { ANALYTICS_EVENTS } from "@pegada/shared/analytics/events";
import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Logo from "@/assets/images/logo";
import { BottomAction } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { APP_SHARE_LINK_BASE } from "@/constants";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import {
  getAppVersion,
  getMinimumSupportedVersion,
} from "@/services/force-update";

import { CenterText, Container, styles } from "./styles";

/**
 * Both events carry the running build and the floor that rejected it, which is
 * what turns "people are stuck" into "people on 1.6.2 are stuck behind 1.7.2"
 * without joining anything.
 */
const versionProperties = () => ({
  app_version: getAppVersion(),
  minimum_version: getMinimumSupportedVersion(),
});

const ForceUpdate: React.FC = () => {
  const { theme } = useUnistyles();
  const { t } = useTranslation();

  // Mount is the whole event: this screen replaces the app, and the only way
  // off it is the store.
  React.useEffect(() => {
    analytics.track({
      event_type: ANALYTICS_EVENTS.UPDATE_REQUIRED_SHOWN,
      event_properties: versionProperties(),
    });
  }, []);

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
            analytics.track({
              event_type: ANALYTICS_EVENTS.UPDATE_REQUIRED_STORE_TAPPED,
              event_properties: versionProperties(),
            });
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
