import type { TextInput } from "react-native";

import { forwardRef, useImperativeHandle, useRef } from "react";
import * as React from "react";
import { View } from "react-native";

import OtpDigit, { OTP_INPUT_HEIGHT, OTP_INPUT_MARGIN } from "../OtpDigit";
import { styles } from "./styles";

const OTP_INPUT_MAX_WIDTH = OTP_INPUT_HEIGHT;

export type OtpInputRef = {
  focus: () => void;
};

type OtpInputProps = {
  value: string;
  length: number;
  onChangeText: React.Dispatch<React.SetStateAction<string>>;
};

const OTPInput = forwardRef<OtpInputRef, OtpInputProps>(
  ({ length, value, onChangeText }, ref) => {
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleFocus = () => {
      inputRefs.current[0]?.focus();
    };

    useImperativeHandle(ref, () => ({
      focus: handleFocus,
    }));

    const changeDigit = (digit: string, index: number) => {
      return onChangeText((previousValue) => {
        const newValue = `${previousValue.slice(0, index)}${digit}${previousValue.slice(index + 1)}`;

        return newValue.slice(0, length);
      });
    };

    const handleChange = (digit: string, index: number) => {
      if (!digit || digit.match(/[^0-9]/g)) return;
      changeDigit(digit, index);

      const nextIndex = Math.min(index + digit.length - 1, length - 1);

      inputRefs.current?.[nextIndex]?.focus();
    };

    const handleErase = (_digit: string, index: number) => {
      changeDigit("", index);

      inputRefs.current?.[index - 1]?.focus();
    };

    const otp_max_width = (OTP_INPUT_MAX_WIDTH + OTP_INPUT_MARGIN) * length;

    return (
      <View style={[styles.verifyRowView, { maxWidth: otp_max_width }]}>
        {Array.from({ length }, (_, index) => {
          const previousValue = value?.[index - 1];
          const isFirst = index === 0;

          return (
            <OtpDigit
              key={index}
              ref={(el: TextInput) => {
                inputRefs.current[index] = el;
              }}
              index={index}
              length={length}
              pointerEvents={previousValue || isFirst ? "auto" : "none"}
              handleChange={handleChange}
              handleErase={handleErase}
              testID={`otp-digit-${index}`}
            >
              {value[index]}
            </OtpDigit>
          );
        })}
      </View>
    );
  },
);

export default OTPInput;
