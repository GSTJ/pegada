import Color from "color";
import styled, { css } from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";

interface CheckContainerProps {
  selected?: boolean;
}

export const Flex = styled.View`
  flex: 1;
`;

export const Container = styled.View`
  gap: ${({ theme }) => theme.spacing[2.5]}px;
`;

export const PlanContainer = styled(PressableArea)<CheckContainerProps>`
  border-width: ${({ theme }) => theme.stroke.lg}px;
  border-color: ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md}px;
  gap: ${({ theme }) => theme.spacing[3.5]}px;
  flex-direction: row;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[4]}px;
  border-radius: ${({ theme }) => theme.radii.md}px;

  ${(props) =>
    props.selected &&
    css`
      background-color: ${({ theme }) =>
        Color(theme.colors.primary).alpha(0.1).toString()};
      border-color: ${({ theme }) => theme.colors.primary};
    `}
`;

export const PercentContainer = styled.View`
  position: absolute;
  top: ${({ theme }) => -theme.spacing[3]}px;
  right: ${({ theme }) => theme.spacing[3]}px;
  background-color: ${({ theme }) => theme.colors.primary};
  padding: ${({ theme }) => theme.spacing[1]}px
    ${({ theme }) => theme.spacing[2]}px;
  border-radius: ${({ theme }) => theme.radii.sm}px;
`;

export const PercentText = styled(Text)`
  line-height: ${({ theme }) => theme.typography.sizes.sm.size}px;
  color: white;
`;

export const Price = styled(Text)``;

export const OldPrice = styled(Price)`
  text-decoration-line: line-through;
`;
