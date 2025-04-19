import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import styled from "styled-components/native";

import Close from "@/assets/images/Close.svg";
import { PressableArea } from "@/components/PressableArea";

export const TitleContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: ${(props) => props.theme.spacing[4]}px;
  border-bottom-width: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) => props.theme.colors.border};
`;

type SelectedItemProps = {
  selected?: boolean;
};

export const SelectItem = styled(PressableArea)<SelectedItemProps>`
  padding: ${(props) => props.theme.spacing[4]}px;
  border-bottom-width: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) => props.theme.colors.border};
  background-color: ${(props) =>
    props.selected ? props.theme.colors.accent : props.theme.colors.background};
`;

export const SearchContainer = styled.View`
  padding: ${(props) => props.theme.spacing[2]}px
    ${(props) => props.theme.spacing[1.5]}px;
  border-bottom-width: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.background};
`;

export const SearchInput = styled(BottomSheetTextInput).attrs((props) => ({
  placeholderTextColor: props.theme.colors.placeholder,
  ...props
}))`
  color: ${(props) => props.theme.colors.text};
  font-family: ${(props) => props.theme.typography.fontFamily.medium};
  font-weight: medium;
  font-size: ${(props) => props.theme.typography.sizes.xs.size}px;
  padding: ${(props) => props.theme.spacing[1.5]}px
    ${(props) => props.theme.spacing[2]}px;
  border-radius: ${(props) => props.theme.radii.sm}px;
  border-width: ${(props) => props.theme.stroke.md}px;
  border-color: ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.input};
`;

export const CloseIcon = styled(Close).attrs((props) => ({
  name: "close",
  width: 14,
  height: 14,
  fill: props.theme.colors.text,
  ...props
}))``;

export const Container = styled.View`
  flex: 1;
`;
