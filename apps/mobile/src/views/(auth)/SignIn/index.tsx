import { useState } from "react";
import { Alert, Keyboard, Platform } from "react-native";

import { useRouter } from "expo-router";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

import { OTPRequiredError } from "@pegada/shared/errors/errors";
import { Trans, useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";

import { Button } from "@/components/Button";
import { api } from "@/contexts/trpc-provider";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/use-keyboard-aware-safe-area-insets";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";
import { SceneName } from "@/types/scene-name";

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
  TopCard,
} from "./styles";

export const useCustomBottomInset = () => {
  const insets = useKeyboardAwareSafeAreaInsets();
  const theme = useTheme();
  return Math.max(theme.spacing[4], insets.bottom + theme.spacing[1]);
};

const requestTrackingPermissions = async () => {
  try {
    await requestTrackingPermissionsAsync();
  } catch (error) {
    sendError(error);
  }
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
        // Fire-and-forget: the OTP screen must not wait on the ATT prompt.
        // `void` rather than a chained catch, which `promise/no-promise-in-callback`
        // (rightly) reads as a second error path inside a callback.
        void requestTrackingPermissions();

        return router.push({
          pathname: SceneName.OneTimeCode,
          params: { email },
        });
      }

      Alert.alert(t("common.oops"), t("insertEmail.loginError"));
      sendError(error);
    },
  });

  const handleLogin = () => {
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
            <Button
              loading={loginMutation.isPending}
              onPress={handleLogin}
              testID="signin-submit"
            >
              {t("insertEmail.continue")}
            </Button>
          </BottomCard>
        </Container>
      </KeyboardAvoidingViewStyled>
    </PressableContainer>
  );
};

export default InsertEmail;
