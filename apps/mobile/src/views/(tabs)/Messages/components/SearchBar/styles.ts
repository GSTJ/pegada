import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

export const TextField = styled.TextInput.attrs((props) => ({
  placeholderTextColor: props.theme.colors.placeholder,
  selectionColor: props.theme.colors.primary,
  ...props
}))`
  color: ${(props) => props.theme.colors.text};
  padding: ${(props) => props.theme.spacing[2]}px;

  font-family: ${(props) => props.theme.typography.fontFamily.medium};
  font-size: ${(props) => props.theme.typography.sizes.xs.size}px;
  font-weight: medium;

  flex-grow: 1;
`;

export const SearchFieldContainer = styled.View`
  flex-direction: row;
  align-items: center;

  border-radius: ${(props) => props.theme.radii.md}px;
  padding: 0px ${(props) => props.theme.spacing[3]}px;
  border: ${(props) => props.theme.stroke.sm}px;
  border-color: ${(props) => props.theme.colors.border};
  background-color: ${(props) => props.theme.colors.input};
`;

export const Container = styled(SafeAreaView)`
  padding: ${(props) => props.theme.spacing[3]}px;
  padding-top: ${(props) => props.theme.spacing[2]}px;

  border-bottom-width: ${(props) => props.theme.stroke.sm}px;
  border-bottom-color: ${(props) => props.theme.colors.border};
`;
