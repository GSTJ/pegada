import styled from "styled-components/native";

export const Container = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: #cbffd0;
  border-radius: ${(props) => props.theme.radii.md}px;
`;
