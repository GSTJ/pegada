import * as React from "react";
import { PressableProps } from "react-native";

import Loading from "@/components/Loading";
import { ButtonText, Container, ContainerProps } from "./styles";

export interface ButtonProps extends ContainerProps, PressableProps {
  children: string;
}

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
