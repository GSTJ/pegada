import styled from "styled-components/native";

export const InputRow = styled.View`
  flex-direction: row;
`;

export const InputSpace = styled.View`
  width: ${(props) => props.theme.spacing[4]}px;
`;

export const SliderContainer = styled.View`
  flex: 1;
`;

export const Divisor = styled.View`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border};
  margin: ${(props) => props.theme.spacing[5]}px;
`;

export const ButtonContainer = styled.View`
  padding: ${(props) => props.theme.spacing[4]}px;
  border-top-color: ${({ theme }) => theme.colors.border};
  border-top-width: ${(props) => props.theme.stroke.md}px;
  background-color: ${({ theme }) => theme.colors.background};
`;

export const Container = styled.ScrollView`
  flex-grow: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

export const DistanceContainer = styled.View`
  margin-bottom: ${(props) => props.theme.spacing[6]}px;
`;
