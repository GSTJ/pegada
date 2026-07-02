import styled from "styled-components/native";

import { PICTURE_SIZE } from "./components/Message/styles";

export const Container = styled.KeyboardAvoidingView`
  background-color: ${(props) => props.theme.colors.background};
  flex: 1;
`;

export const Title = styled.View`
  padding: 0 ${(props) => props.theme.spacing[4]}px;
`;

export const SectionSeparator = styled.View`
  height: ${(props) => props.theme.spacing[2.5]}px;
  background-color: ${(props) => props.theme.colors.card};
`;

export const DividerContainer = styled.View`
  margin-right: ${(props) => props.theme.spacing[4]}px;
  margin-left: ${(props) => props.theme.spacing[4] * 2 + PICTURE_SIZE}px;
`;
