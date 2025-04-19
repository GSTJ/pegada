import { forwardRef, useState } from "react";
import { TextInput } from "react-native";
import { useTheme } from "styled-components/native";

import * as S from "./styles";

export enum KeyboardKeys {
  Backspace = "Backspace"
}

type OtpDigitProps = {
  children: string;
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
      testID
    },
    ref
  ) => {
    const [selected, setSelected] = useState(false);

    const { colors } = useTheme();

    const isFirst = index === 0;
    const isLast = index === length - 1;

    const rightMargin = isLast ? 0 : OTP_INPUT_MARGIN;
    const selectedBorderColor = colors.border;

    const digit = isNaN(Number(children)) ? "" : children;

    return (
      <S.Container
        style={{
          marginRight: rightMargin,
          borderColor: selected ? selectedBorderColor : colors.transparent,
          height: OTP_INPUT_HEIGHT
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
          onKeyPress={({
            nativeEvent: { key }
          }: {
            nativeEvent: { key: KeyboardKeys };
          }) => {
            if (key === KeyboardKeys.Backspace)
              return handleErase(digit, index);
          }}
        />

        <S.AbsoluteContainer pointerEvents="none">
          <S.StyledText
            style={{
              color: digit ? colors.text : colors.placeholder
            }}
          >
            {digit || "0"}
          </S.StyledText>
        </S.AbsoluteContainer>
      </S.Container>
    );
  }
);

export default OtpDigit;
