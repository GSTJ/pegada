import { useState } from "react";
import { Alert, Keyboard, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
import { Trans, useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { OTPRequiredError } from "@pegada/shared/errors/errors";

import { Button } from "@/components/Button";
import { api } from "@/contexts/TRPCProvider";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/useKeyboardAwareSafeAreaInsets";
import { sendError } from "@/services/errorTracking";
import { getError } from "@/services/getError";
import { SceneName } from "@/types/SceneName";
import EmailInput from "./components/EmailInput";
import HeroText from "./components/HeroText";
import {
  BottomCard,
  Container,
  Description,
  Highlight,
  KeyboardAvoidingViewStyled,
  LogoStyled,
  PressableContainer,
  Title,
  TopCard
} from "./styles";

export const useCustomBottomInset = () => {
  const insets = useKeyboardAwareSafeAreaInsets();
  const theme = useTheme();
  return Math.max(theme.spacing[4], insets.bottom + theme.spacing[1]);
};

const InsertEmail = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = useCustomBottomInset();
  const theme = useTheme();

  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  const loginMutation = api.authentication.login.useMutation({
    onError: (error) => {
      // Resend code
      if (getError(error, OTPRequiredError)) {
        requestTrackingPermissionsAsync().catch(sendError);

        return router.push({
          pathname: SceneName.OneTimeCode,
          params: { email }
        });
      }

      Alert.alert(t("common.oops"), t("insertEmail.loginError"));
      sendError(error);
    }
  });

  const handleLogin = async () => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      return setError(t("insertEmail.validEmail"));
    }

    loginMutation.mutate({ email });
  };

  return (
    <PressableContainer onPress={() => Keyboard.dismiss()}>
      <KeyboardAvoidingViewStyled
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Container>
          <TopCard
            source={require("@/assets/images/background.webp")}
            style={{ paddingTop: 60 + insets.top }}
          >
            <LogoStyled width={70} height={70} fill={theme.colors.text} />
            <HeroText />
          </TopCard>
          <BottomCard style={{ paddingBottom: bottomInset }}>
            <Title>
              <Trans i18nKey="insertEmail.insertEmail">
                Insert your <Highlight>email</Highlight>
              </Trans>
            </Title>
            <Description>{t("insertEmail.accountCode")}</Description>
            <EmailInput
              enablesReturnKeyAutomatically
              returnKeyType="send"
              onSubmitEditing={handleLogin}
              blurOnSubmit={false}
              placeholder={t("insertEmail.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              error={error}
            />
            <Button loading={loginMutation.isPending} onPress={handleLogin}>
              {t("insertEmail.continue")}
            </Button>
          </BottomCard>
        </Container>
      </KeyboardAvoidingViewStyled>
    </PressableContainer>
  );
};

export default InsertEmail;
