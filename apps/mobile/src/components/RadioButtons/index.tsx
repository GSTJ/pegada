import type { OptionButtonProps } from "./styles";

import * as React from "react";
import { View } from "react-native";

import { styles as inputStyles } from "@/components/Input/styles";
import { Text } from "@/components/text";

import { RadioButtonContainer, TextButton, styles } from "./styles";

/**
 * One selectable option. `id` is the value the form stores, `name` is what
 * the user reads — they are separate because the label is translated and the
 * value is not. Before this split, `onChange` handed back the translated
 * label and every caller mapped it back with a string comparison against
 * `t(...)`, which is also why no option could carry a stable testID.
 */
export type RadioButtonItem = {
  id: string;
  name: string;
};

type RadioButtonsProps = {
  title: string;
  data: RadioButtonItem[];
  /** The selected option's `id`. Nothing is marked while it is undefined. */
  value: string | undefined;
  onChange: (id: string) => void;
  /**
   * When provided, each option receives `testID={itemTestIDPrefix + item.id}`.
   * Same contract as {@link InputPicker}'s prop of the same name, so Maestro
   * flows select a radio the way they select a picker row.
   */
  itemTestIDPrefix?: string;
};

type RadioButtonProps = {
  children: string;
} & OptionButtonProps;

const RadioButton: React.FC<RadioButtonProps> = (props) => {
  styles.useVariants({ last: props.last, marked: props.marked });
  return (
    <RadioButtonContainer
      testID={props.testID}
      onPress={props.onPress}
      // The option was a Pressable wrapping a bare <Text>: no label of its
      // own, no role, and its selected state conveyed by fill colour alone.
      // Same treatment PickerSelectItem got — one element, labelled, with the
      // selection exposed rather than only painted.
      accessible
      accessibilityRole="radio"
      accessibilityLabel={props.children}
      accessibilityState={{ selected: Boolean(props.marked) }}
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
  itemTestIDPrefix,
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
              key={item.id}
              testID={
                itemTestIDPrefix ? `${itemTestIDPrefix}${item.id}` : undefined
              }
              marked={item.id === value}
              onPress={() => onChange(item.id)}
              last={index === data.length - 1}
            >
              {item.name}
            </RadioButton>
          );
        })}
      </View>
    </View>
  );
};
