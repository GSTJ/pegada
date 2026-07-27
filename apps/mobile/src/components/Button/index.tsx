import type { ContainerProps } from "./styles";

import type { PressableProps } from "react-native";

import * as React from "react";

import Loading from "@/components/loading";

import { ButtonText, Container } from "./styles";

export type ButtonProps = {
  children: string;
} & ContainerProps &
  PressableProps;

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
