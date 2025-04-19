import * as React from "react";

import { Container } from "@/components/Input/styles";
import { Text } from "@/components/Text";
import {
  Content,
  OptionButtonProps,
  RadioButtonContainer,
  TextButton
} from "./styles";

interface RadioButtonsProps {
  title: string;
  data: string[];
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
}

interface RadioButtonProps extends OptionButtonProps {
  children: string;
}

const RadioButton: React.FC<RadioButtonProps> = (props) => {
  return (
    <RadioButtonContainer
      onPress={props.onPress}
      marked={props.marked}
      last={props.last}
    >
      <TextButton marked={props.marked} fontWeight="bold" fontSize="md">
        {props.children}
      </TextButton>
    </RadioButtonContainer>
  );
};

export const RadioButtons: React.FC<RadioButtonsProps> = ({
  title,
  data,
  onChange,
  value
}) => {
  return (
    <Container>
      <Text fontWeight="bold" fontSize="lg">
        {title}
      </Text>
      <Content>
        {data.map((item, index) => {
          return (
            <RadioButton
              key={item}
              marked={item === value}
              onPress={() => onChange(item)}
              last={index === data.length - 1}
            >
              {item}
            </RadioButton>
          );
        })}
      </Content>
    </Container>
  );
};
