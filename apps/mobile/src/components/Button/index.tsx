import type { ContainerProps } from "./styles";

import type { PressableProps, StyleProp, ViewStyle } from "react-native";

import * as React from "react";

import Loading from "@/components/loading";

import { ButtonText, Container } from "./styles";

/**
 * `Pressable`'s style callback is gone from the public type: composing it with
 * the sheet needs a plain style, and the callback never worked here anyway —
 * styled-components handed it to `PressableArea` inside an array, where the
 * function was never called.
 */
export type ButtonProps = {
  children: string;
  style?: StyleProp<ViewStyle>;
} & ContainerProps &
  Omit<PressableProps, "style">;

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  const disabled = props.loading || props.disabled;
  const onPress = disabled ? null : props.onPress;

  return (
    <Container {...props} disabled={disabled} onPress={onPress}>
      {props.loading ? (
        <Loading inverse />
      ) : (
        <ButtonText fontWeight="bold" fontSize="lg" variant={props.variant}>
          {children}
        </ButtonText>
      )}
    </Container>
  );
};
