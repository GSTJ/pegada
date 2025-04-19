import styled from "styled-components/native";

import * as ModalStyles from "@/components/DefaultModal/styles";

export const Container = styled(ModalStyles.Container)`
  gap: ${(props) => props.theme.spacing[2]}px;
  padding-top: ${(props) => props.theme.spacing[7]}px;
`;

export const Header = styled.View`
  align-items: center;
  justify-content: space-between;
  gap: ${(props) => props.theme.spacing[1.5]}px;
  width: 100%;
`;

export const CountdownContainer = styled.View`
  align-items: center;
  justify-content: center;
  background-color: ${(props) => props.theme.colors.card};
  padding: ${(props) => props.theme.spacing[3]}px;
  border-radius: ${(props) => props.theme.radii.md}px;
  margin-top: ${(props) => props.theme.spacing[3]}px;
  width: 100%;
`;
