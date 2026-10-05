import * as React from "react";
import { Pressable, type PressableProps, type View } from "react-native";

const ACTIVE_OPACITY = 0.9;
export const PressableArea = React.forwardRef<View, PressableProps>(({ style, ...rest }, ref) => {
  return (
    <Pressable
      ref={ref}
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
});

PressableArea.displayName = "PressableArea";
