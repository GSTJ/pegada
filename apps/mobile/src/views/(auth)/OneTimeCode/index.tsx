import type { OtpInputRef } from "./components/OtpInput";

import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import {
  InvalidOTPCodeError,
  OTPRequiredError,
} from "@pegada/shared/errors/errors";
import { format, set } from "date-fns";
import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";
import { getInitialRouteName } from "@/services/get-initial-route-name";
import { StorageKeys, storeData } from "@/services/storage";
import { useDidMountEffect } from "@/services/utils";

import { Underline } from "../SignIn/components/HeroText";
import GoBack from "./components/GoBack";
import OTPInput from "./components/OtpInput";
import useTimer from "./hooks/use-timer";
import { Description, ResendCode, Timer, styles } from "./styles";

const CODE_LENGTH = 6;
const INITIAL_TIMEOUT_IN_SECONDS = 50;
const RESEND_TIMEOUT_IN_SECONDS = 50;

const OneTimeCode = () => {
  const [timer, setTimer] = useTimer(INITIAL_TIMEOUT_IN_SECONDS);
  const insets = useSafeAreaInsets();
  const [keyboardInput, setKeyboardInput] = useState("");

  const { email } = useLocalSearchParams();

  const updatedTime = set(new Date(), { minutes: 0, seconds: timer });
  const formattedTime = format(updatedTime, "mm:ss");

  const router = useRouter();
  const { t } = useTranslation();

  const inputRef = useRef<OtpInputRef>(null);

  const insetTop = Math.max(15 + insets.top, 50);

  const loginMutation = api.authentication.login.useMutation({
    onSuccess: async (data) => {
      try {
        const { token } = data;
        await storeData(StorageKeys.Token, token);

        const initialRouteName = await getInitialRouteName();

        router.replace(initialRouteName);
      } catch (error) {
        sendError(error);
        magicToast.alert(t("common.tryAgainLater"), 1000);
      }
    },
    onError: (error) => {
      inputRef.current?.focus();

      // Resend code
      if (getError(error, OTPRequiredError)) {
        setTimer(RESEND_TIMEOUT_IN_SECONDS);
        setKeyboardInput("");
        return;
      }

      // Invalid code
      if (getError(error, InvalidOTPCodeError)) {
        analytics.track({ event_type: "User Typed Invalid OTP code" });
        magicToast.alert(t("oneTimeCode.invalidCode"), 1000);
        setKeyboardInput("");
        return;
      }

      magicToast.alert(t("common.tryAgainLater"), 1000);
      sendError(error);
    },
  });

  const handleResendCode = () => {
    // Submitting with no code will trigger a resend
    loginMutation.mutate({ email: email as string });
  };

  useDidMountEffect(() => {
    if (keyboardInput.length === CODE_LENGTH) {
      loginMutation.mutate({ email: email as string, code: keyboardInput });
    }
  }, [keyboardInput]);
  styles.useVariants({ disabled: Boolean(timer) });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.styledKeyboardAvoidingView}
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insetTop,
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          },
        ]}
      >
        <GoBack onPress={() => router.back()} />

        <View style={styles.content}>
          <View style={styles.topColumn}>
            <Timer style={styles.timer} fontSize="xxxl" fontWeight="bold">
              {formattedTime}
            </Timer>
            <Description style={styles.description}>
              {t("oneTimeCode.insertCode")}{" "}
              <Text fontWeight="medium">{email}</Text>
            </Description>

            <OTPInput
              ref={inputRef}
              length={CODE_LENGTH}
              value={keyboardInput}
              onChangeText={setKeyboardInput}
            />
          </View>
        </View>

        <ResendCode
          testID="otp-resend"
          onPress={() => {
            handleResendCode();
          }}
          style={styles.resendCode}
        >
          <Underline>
            <Text fontSize="lg" fontWeight="bold">
              {t("oneTimeCode.resendCode")}
            </Text>
          </Underline>
        </ResendCode>

        {loginMutation.isPending ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
};

export default OneTimeCode;
