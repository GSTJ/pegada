import styled from "styled-components/native";

export const Container = styled.View`
  background-color: ${({ theme }) => theme.colors.background};
  flex: 1;
`;

export const LocationView = styled.View`
  justify-content: center;
  align-items: center;
  max-width: 250px;
`;

export const BottomView = styled.View`
  border-top-color: ${({ theme }) => theme.colors.border};
  border-top-width: ${(props) => props.theme.stroke.md}px;
  padding: ${(props) => props.theme.spacing[6]}px;
  padding-top: 20px;
`;

export const InformationRow = styled.View`
  flex-direction: row;
  align-items: center;
  margin-bottom: 20px;
`;
