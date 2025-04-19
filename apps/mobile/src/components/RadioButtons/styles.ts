import { PressableProps } from "react-native";
import styled, { css } from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";

export interface OptionButtonProps extends PressableProps {
  marked?: boolean;
  last?: boolean;
}

export const Content = styled.View`
  justify-content: space-between;
  flex-grow: 1;
  align-items: center;
  flex-direction: row;
  padding-top: ${(props) => props.theme.spacing[3]}px;
`;

export const RadioButtonContainer = styled(PressableArea)<OptionButtonProps>`
  padding: ${(props) => props.theme.spacing[3]}px
    ${(props) => props.theme.spacing[4]}px;

  background-color: ${(props) => props.theme.colors.background};

  border-width: ${(props) => props.theme.stroke.xxl}px;
  border-color: ${(props) => props.theme.colors.primary};

  border-radius: ${(props) => props.theme.radii.md}px;
  flex: 1;
  align-items: center;

  ${(props) => {
    if (!props?.last) {
      return css`
        margin-right: ${(props) => props.theme.spacing[3]}px;
      `;
    }
  }};

  ${(props) => {
    if (props?.marked) {
      return css`
        background-color: ${(props) => props.theme.colors.primary};
      `;
    }
  }};
`;

export const TextButton = styled(Text)<OptionButtonProps>`
  color: ${(props) => props.theme.colors.primary};

  ${(props) => {
    if (props?.marked) {
      return css`
        color: ${(props) => props.theme.colors.background};
      `;
    }
  }}
`;
