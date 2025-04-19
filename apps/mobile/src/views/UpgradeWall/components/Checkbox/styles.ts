import Color from "color";
import styled, { css } from "styled-components/native";

interface CheckContainerProps {
  selected?: boolean;
}

export const Container = styled.View<CheckContainerProps>`
  height: ${({ theme }) => theme.spacing[6]}px;
  width: ${({ theme }) => theme.spacing[6]}px;
  align-items: center;
  justify-content: center;

  border-radius: ${({ theme }) => theme.radii.round}px;

  background-color: ${({ theme }) => theme.colors.card};
  border-width: ${({ theme }) => theme.stroke.lg}px;
  border-color: ${({ theme }) => theme.colors.border};

  ${(props) =>
    props.selected &&
    css`
      background-color: ${({ theme }) =>
        Color(theme.colors.primary).alpha(0.2).toString()};
      border-color: ${({ theme }) => theme.colors.primary};
    `}
`;
