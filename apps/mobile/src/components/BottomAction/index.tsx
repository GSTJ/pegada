import * as React from "react";
import { Platform } from "react-native";
import { BlurViewProps } from "expo-blur";
import { useTheme } from "styled-components/native";

import { useKeyboardAwareSafeAreaInsets } from "../../hooks/useKeyboardAwareSafeAreaInsets";
import { BUTTON_HEIGHT } from "../Button/styles";
import * as S from "./styles";

export const useBottomActionStyle = () => {
  const insets = useKeyboardAwareSafeAreaInsets();
  const theme = useTheme();

  const bottomActionConstantSize = BUTTON_HEIGHT + theme.spacing[4];

  // For some reason, android doesn't work with this workaround
  // and its better for contentInset bottom to be 0
  const bottomActionKeyboardOpenSize =
    Platform.OS === "ios" ? bottomActionConstantSize + theme.spacing[4] : 0;

  const paddingBottom = Math.max(insets.bottom, theme.spacing[4]);

  const height = BUTTON_HEIGHT + theme.spacing[4] + paddingBottom;

  const contentContainerStyle = {
    // That moves the content up to account for the bottom action
    paddingBottom: height - bottomActionKeyboardOpenSize + theme.spacing[4] / 2
  };

  return {
    height,
    paddingBottom,
    // All this weirdness is necessary in order for the Scrollview to focus
    // correctly on inputs when the keyboard is open with the KeyboardAvoidingView
    scrollViewProps: {
      contentInset: {
        // That tells the scrollview to give an inset while focusing on the input, basically
        bottom: bottomActionKeyboardOpenSize
      },
      contentContainerStyle,
      showsVerticalScrollIndicator: false
    }
  };
};

const Container: React.FC<BlurViewProps> = React.forwardRef((props, ref) => {
  const { height, paddingBottom } = useBottomActionStyle();

  return (
    <S.Container
      {...props}
      ref={ref}
      style={[
        {
          height,
          paddingBottom
        },
        props.style
      ]}
    />
  );
});

export const BottomAction = {
  Container
};
