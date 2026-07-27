import * as React from "react";
import { Pressable, PressableProps } from "react-native";

const ACTIVE_OPACITY = 0.9;
export const PressableArea: React.FC<PressableProps> = ({ style, ...rest }) => {
  return (
    <Pressable
      {...rest}
      style={(args) => {
        const appliedStyle = typeof style === "function" ? style(args) : style;

        if (args.pressed) {
          return [appliedStyle, { opacity: ACTIVE_OPACITY }];
        }

        return appliedStyle;
      }}
    />
  );
};
