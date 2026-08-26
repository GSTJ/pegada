import { useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  KeyboardAvoidingView,
  View,
} from "react-native";

import { useRouter } from "expo-router";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

import { OTPRequiredError } from "@pegada/shared/errors/errors";
import { Trans, useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { api } from "@/contexts/trpc-provider";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/use-keyboard-aware-safe-area-insets";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";
import { SceneName } from "@/types/scene-name";

import EmailInput from "./components/EmailInput";
import HeroText from "./components/HeroText";
import {
  Container,
  Description,
  Highlight,
  LogoStyled,
  Title,
  TopCard,
  styles,
} from "./styles";

export const useCustomBottomInset = () => {
  const insets = useKeyboardAwareSafeAreaInsets();
  const { theme } = useUnistyles();
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
  const { theme } = useUnistyles();

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
    <Pressable
      onPress={() => Keyboard.dismiss()}
      style={styles.pressableContainer}
      accessible={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingViewStyled}
      >
        <Container style={styles.container} edges={["left", "right"]}>
          <TopCard
            source={require("@/assets/images/background.webp")}
            style={[styles.topCard, { paddingTop: 60 + insets.top }]}
          >
            <LogoStyled
              width={70}
              height={70}
              fill={theme.colors.text}
              style={styles.logoStyled}
            />
            <HeroText />
          </TopCard>
          <View style={[styles.bottomCard, { paddingBottom: bottomInset }]}>
            <Title style={styles.title} fontSize="xl" fontWeight="bold">
              {/*
                The leading text is an expression rather than bare JSX text on
                purpose. "insertEmail.insertEmail" is `Insert your <1>email</1>`,
                and react-i18next resolves `<1>` positionally against these
                children — so `Insert your <Highlight>` has to stay exactly two
                children. Written as text it does not: `<Highlight>` no longer
                fits on the line once the sheet and the two size props are on
                it, and the formatter splits the string off from its trailing
                space as `Insert your{" "}`, which pushes `<Highlight>` to index
                2 and binds `<1>` to the whitespace. The pink `email` then
                disappears from the headline.
              */}
              <Trans i18nKey="insertEmail.insertEmail">
                {"Insert your "}
                <Highlight
                  style={styles.highlight}
                  fontSize="xl"
                  fontWeight="bold"
                >
                  email
                </Highlight>
              </Trans>
            </Title>
            <Description style={styles.description}>
              {t("insertEmail.accountCode")}
            </Description>
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
          </View>
        </Container>
      </KeyboardAvoidingView>
    </Pressable>
  );
};

export default InsertEmail;
