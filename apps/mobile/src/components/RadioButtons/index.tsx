import type { OptionButtonProps } from "./styles";

import * as React from "react";
import { View } from "react-native";

import { styles as inputStyles } from "@/components/Input/styles";
import { Text } from "@/components/text";

import { RadioButtonContainer, TextButton, styles } from "./styles";

type RadioButtonsProps = {
  title: string;
  data: string[];
  value: string;
  onChange: React.Dispatch<React.SetStateAction<string>>;
};

type RadioButtonProps = {
  children: string;
} & OptionButtonProps;

const RadioButton: React.FC<RadioButtonProps> = (props) => {
  styles.useVariants({ last: props.last, marked: props.marked });
  return (
    <RadioButtonContainer
      onPress={props.onPress}
      style={styles.radioButtonContainer}
    >
      <TextButton fontWeight="bold" fontSize="md" style={styles.textButton}>
        {props.children}
      </TextButton>
    </RadioButtonContainer>
  );
};

export const RadioButtons: React.FC<RadioButtonsProps> = ({
  title,
  data,
  onChange,
  value,
}) => {
  return (
    <View style={inputStyles.container}>
      <Text fontWeight="bold" fontSize="lg">
        {title}
      </Text>
      <View style={styles.content}>
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
      </View>
    </View>
  );
};
