import type { OtpInputRef } from "./components/OtpInput";

import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import {
  InvalidOTPCodeError,
  OTPRequiredError,
} from "@pegada/shared/errors/errors";
import { format } from "date-fns/format";
import { set } from "date-fns/set";
import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";
import { useKeyboardOverlap } from "@/hooks/use-keyboard-aware-scroll";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";
import { getInitialRouteName } from "@/services/get-initial-route-name";
import { StorageKeys, storeData } from "@/services/storage";
import {
  shouldRetryTransient,
  transientRetryDelayMs,
} from "@/services/transient-retry";
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
    // Same policy as the email step. INVALID_OTP_CODE carries an `error_code`
    // and is never retried, so a code the server already consumed is reported
    // once rather than re-submitted.
    retry: shouldRetryTransient,
    retryDelay: transientRetryDelayMs,
    onSuccess: async (data) => {
      try {
        analytics.track({
          event_type: "OTP Verified",
          event_properties: { success: true },
        });

        // The last code cell is still focused, and nothing on the screen this
        // navigates to is. On Android that leaves the keypad up over
        // CreateProfile with no field to type into — an orphan, covering the
        // form's first input.
        Keyboard.dismiss();

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
        analytics.track({
          event_type: "OTP Requested",
          event_properties: { resend: true },
        });
        setTimer(RESEND_TIMEOUT_IN_SECONDS);
        setKeyboardInput("");
        return;
      }

      // Invalid code
      if (getError(error, InvalidOTPCodeError)) {
        analytics.track({
          event_type: "OTP Verified",
          event_properties: { success: false },
        });
        // Kept alongside the funnel event: it predates it and the historical
        // series is still the one the old insights are built on.
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

  const keyboardOverlap = useKeyboardOverlap();

  return (
    /*
      Not a KeyboardAvoidingView: `behavior` has to be left undefined on
      Android, where the component then does nothing at all. The first code
      cell autofocuses, so the keypad is up before this screen has drawn once.
    */
    <View
      style={[
        styles.styledKeyboardAvoidingView,
        { paddingBottom: keyboardOverlap },
      ]}
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
    </View>
  );
};

export default OneTimeCode;
