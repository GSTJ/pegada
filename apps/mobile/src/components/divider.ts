import styled from "styled-components/native";

export default styled.View`
  background-color: ${(props) => props.theme.colors.border};
  height: ${(props) => props.theme.stroke.sm}px;
`;
