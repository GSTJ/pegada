import { ActivityIndicator } from "react-native";
import styled from "styled-components/native";

import cancelIcon from "@/assets/images/Cancel.svg";
import { PressableArea } from "@/components/PressableArea";

export const Container = styled.View`
  margin-top: ${(props) => props.theme.spacing[4]}px;
`;

export const Content = styled.View`
  flex-direction: row;
  background-color: ${(props) => props.theme.colors.input};
  border-radius: ${(props) => props.theme.radii.md}px;
  padding: ${(props) => props.theme.spacing[3.5]}px;
  border: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) => props.theme.colors.border};
  align-items: center;
`;

export const TitleContainer = styled.View`
  margin-bottom: ${(props) => props.theme.spacing[3]}px;
`;

export const CancelTouchArea = styled(PressableArea).attrs({
  hitSlop: {
    top: 10,
    bottom: 10,
    left: 10,
    right: 10
  }
})`
  padding-left: ${(props) => props.theme.spacing[2.5]}px;
`;

export const CancelIcon = styled(cancelIcon).attrs((props) => ({
  fill: props.theme.colors.placeholder
}))`
  opacity: 0.5;
  width: ${(props) => props.theme.spacing[4]}px;
  height: ${(props) => props.theme.spacing[4]}px;
`;

export const TextInput = styled.TextInput.attrs((props) => ({
  placeholderTextColor: props.theme.colors.placeholder,
  selectionColor: props.theme.colors.primary,
  ...props
}))`
  flex: 1;
  color: ${(props) => props.theme.colors.text};
  font-family: ${(props) => props.theme.typography.fontFamily.medium};
  font-weight: medium;
  font-size: ${(props) => props.theme.typography.sizes.xs.size}px;
`;

export const ActivityIndicatorComponent = styled(ActivityIndicator)`
  flex: 1;
`;
