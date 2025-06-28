import type {
  TextInput as _TextInput,
  TextInputProps as _TextInputProps
} from "react-native";
import { Dimensions } from "react-native";
import styled from "styled-components/native";

const deviceHeight = Dimensions.get("window").height;

export const isSmallDevice = deviceHeight < 700;

export const Container = styled.View`
  flex: 1;
  border-radius: ${(props) => props.theme.radii.md}px;
  border-width: ${(props) => props.theme.stroke.lg}px;
  background-color: ${(props) => props.theme.colors.input};
`;

type TextInputProps = _TextInputProps & { ref?: React.RefObject<_TextInput> };
export const TextInput = styled.TextInput<TextInputProps>`
  flex: 1;
  text-align: center;
  color: transparent;
`;

export const AbsoluteContainer = styled.View`
  position: absolute;
  left: 0;
  bottom: 0;
  top: 0;
  right: 0;
  align-items: center;
  justify-content: center;
`;

export const StyledText = styled.Text`
  font-family: ${(props) => props.theme.typography.fontFamily.bold};
  font-weight: bold;
  color: ${(props) => props.theme.colors.text};
  font-size: ${isSmallDevice ? 24 : 30}px;
`;
