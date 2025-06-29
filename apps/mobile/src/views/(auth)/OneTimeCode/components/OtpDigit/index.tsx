import type { TextInput as RNTextInput } from "react-native";
import { useState } from "react";
import { useTheme } from "styled-components/native";

import {
  AbsoluteContainer,
  Container,
  isSmallDevice,
  StyledText,
  TextInput
} from "./styles";

export enum KeyboardKeys {
  Backspace = "Backspace"
}

interface OtpDigitProps {
  children?: string;
  length: number;
  index: number;
  handleChange: (text: string, index: number) => void;
  handleErase: (text: string, index: number) => void;
  pointerEvents?: "auto" | "none";
  testID: string;
  ref: React.RefObject<RNTextInput>;
}

export const OTP_INPUT_HEIGHT = isSmallDevice ? 62 : 80;
export const OTP_INPUT_MARGIN = 6;

const OtpDigit = ({
  ref,
  children,
  index,
  length,
  pointerEvents,
  handleChange,
  handleErase,
  testID
}: OtpDigitProps) => {
  const [selected, setSelected] = useState(false);

  const { colors } = useTheme();

  const isFirst = index === 0;
  const isLast = index === length - 1;

  const rightMargin = isLast ? 0 : OTP_INPUT_MARGIN;
  const selectedBorderColor = colors.border;

  const digit = children && !isNaN(Number(children)) ? children : "";

  return (
    <Container
      style={{
        marginRight: rightMargin,
        borderColor: selected ? selectedBorderColor : colors.transparent,
        height: OTP_INPUT_HEIGHT
      }}
    >
      <TextInput
        ref={ref}
        testID={testID}
        onBlur={() => {
          setSelected(false);
        }}
        onFocus={() => {
          setSelected(true);
        }}
        accessibilityLabel="Text input field"
        accessibilityHint="Enter the verification code"
        value={digit}
        keyboardType="number-pad"
        onChangeText={(text: string) => {
          handleChange(text, index);
        }}
        numberOfLines={1}
        maxLength={length}
        returnKeyType="next"
        pointerEvents={pointerEvents}
        selectionColor="transparent"
        autoFocus={isFirst}
        importantForAutofill={isFirst ? "yes" : "no"}
        textContentType={isFirst ? "oneTimeCode" : "none"}
        autoComplete={isFirst ? "sms-otp" : "off"}
        onKeyPress={(e) => {
          const { key } = e.nativeEvent;
          if (key === KeyboardKeys.Backspace) {
            handleErase(digit, index);
            return;
          }
        }}
      />

      <AbsoluteContainer pointerEvents="none">
        <StyledText
          style={{
            color: digit ? colors.text : colors.placeholder
          }}
        >
          {digit || "0"}
        </StyledText>
      </AbsoluteContainer>
    </Container>
  );
};

export default OtpDigit;
