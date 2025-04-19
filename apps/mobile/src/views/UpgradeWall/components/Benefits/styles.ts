import Color from "color";
import styled from "styled-components/native";

export const BenefitContainer = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3.5]}px;
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding: ${({ theme }) => theme.spacing[3.5]}px;
  background-color: ${({ theme }) => {
    return Color(theme.colors.text)
      .alpha(theme.dark ? 0.05 : 0.02)
      .toString();
  }};
`;

interface BenefitIconContainerProps {
  color: string;
}

export const BenefitIconContainer = styled.View<BenefitIconContainerProps>`
  height: ${({ theme }) => theme.spacing[10]}px;
  width: ${({ theme }) => theme.spacing[10]}px;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm}px;
  background-color: ${({ color, theme }) =>
    Color(color)
      .alpha(theme.dark ? 0.2 : 0.1)
      .toString()};
`;

export const ContentContainer = styled.View`
  flex: 1;
`;

export const Container = styled.View`
  gap: ${({ theme }) => theme.spacing[2.5]}px;
`;
