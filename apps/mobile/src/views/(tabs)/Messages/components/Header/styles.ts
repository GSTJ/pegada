import styled from "styled-components/native";

export const Container = styled.View`
  background-color: ${(props) => props.theme.colors.background};
`;

/** The gutter between two match previews. */
export const PreviewSeparator = styled.View`
  width: ${({ theme }) => theme.spacing[3]}px;
`;
