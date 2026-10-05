import * as React from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

const ACTIVE_OPACITY = 0.9;
interface PressableAreaProps extends PressableProps {
  disableActiveOpacity?: boolean;
  pressedStyle?: StyleProp<ViewStyle>;
}

export const PressableArea: React.FC<PressableAreaProps> = ({
  disableActiveOpacity,
  pressedStyle,
  style,
  ...rest
}) => {
  return (
    <Pressable
      {...rest}
      style={(args) => {
        const appliedStyle = typeof style === "function" ? style(args) : style;

        if (args.pressed) {
          return [
            appliedStyle,
            disableActiveOpacity ? undefined : { opacity: ACTIVE_OPACITY },
            pressedStyle,
          ];
        }

        return appliedStyle;
      }}
    />
  );
};
