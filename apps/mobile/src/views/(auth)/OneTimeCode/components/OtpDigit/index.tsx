import type { TextInput } from "react-native";

import { forwardRef, useState } from "react";
import { Platform } from "react-native";

import { useUnistyles } from "react-native-unistyles";

import * as S from "./styles";

export enum KeyboardKeys {
  Backspace = "Backspace",
}

type OtpDigitProps = {
  /** One character of the code, or nothing while that slot is still empty. */
  children?: string;
  length: number;
  index: number;
  handleChange: (text: string, index: number) => void;
  handleErase: (text: string, index: number) => void;
  pointerEvents?: "auto" | "none";
  testID: string;
};

export const OTP_INPUT_HEIGHT = S.isSmallDevice ? 62 : 80;
export const OTP_INPUT_MARGIN = 6;

const OtpDigit = forwardRef<
  TextInput,
  Omit<React.ComponentPropsWithoutRef<typeof S.Container>, "children"> &
    OtpDigitProps
>(
  (
    {
      children,
      index,
      length,
      pointerEvents,
      handleChange,
      handleErase,
      testID,
    },
    ref,
  ) => {
    const [selected, setSelected] = useState(false);

    const { colors } = useUnistyles().theme;

    const isFirst = index === 0;
    const isLast = index === length - 1;

    const rightMargin = isLast ? 0 : OTP_INPUT_MARGIN;
    const selectedBorderColor = colors.border;

    const digit = children && !Number.isNaN(Number(children)) ? children : "";

    return (
      <S.Container
        style={{
          marginRight: rightMargin,
          borderColor: selected ? selectedBorderColor : colors.transparent,
          height: OTP_INPUT_HEIGHT,
        }}
      >
        <S.TextInput
          ref={ref}
          testID={testID}
          onBlur={() => setSelected(false)}
          onFocus={() => setSelected(true)}
          accessibilityLabel="Text input field"
          accessibilityHint="Enter the verification code"
          value={digit}
          keyboardType="number-pad"
          // A six-digit code, on a keypad that offered a dash, a space, a
          // comma and a full stop. `number-pad` maps to Android's
          // TYPE_CLASS_NUMBER, and Gboard's layout for that class is the
          // general-purpose number pad — punctuation included. The digits-only
          // PIN layout is TYPE_NUMBER_VARIATION_PASSWORD, which React Native
          // derives from `secureTextEntry` on a numeric field. The masking it
          // brings with it is invisible here: this input already renders its
          // text in `transparent` and the digit the user sees is a separate
          // overlay. iOS is left alone — its numeric pad has no punctuation to
          // begin with, and `textContentType="oneTimeCode"` autofill is worth
          // more than a no-op.
          secureTextEntry={Platform.OS === "android"}
          // Sentence capitalisation on a digit field is meaningless, and RN
          // ORs the flag into the inputType regardless of the keyboard class.
          autoCapitalize="none"
          onChangeText={(text: string) => handleChange(text, index)}
          numberOfLines={1}
          maxLength={length}
          returnKeyType="next"
          pointerEvents={pointerEvents}
          selectionColor="transparent"
          autoFocus={isFirst}
          importantForAutofill={isFirst ? "yes" : "no"}
          textContentType={isFirst ? "oneTimeCode" : "none"}
          autoComplete={isFirst ? "sms-otp" : "off"}
          onKeyPress={({ nativeEvent: { key } }) => {
            if (key === KeyboardKeys.Backspace)
              return handleErase(digit, index);
          }}
        />

        <S.AbsoluteContainer pointerEvents="none">
          <S.StyledText
            style={{
              color: digit ? colors.text : colors.placeholder,
            }}
          >
            {digit || "0"}
          </S.StyledText>
        </S.AbsoluteContainer>
      </S.Container>
    );
  },
);

export default OtpDigit;
