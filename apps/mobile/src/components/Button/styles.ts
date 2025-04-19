import styled, { css } from "styled-components/native";

import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";

interface VariantProps {
  variant?: "outline" | "default";
}
export interface ContainerProps extends VariantProps {
  loading?: boolean;
}

export const BUTTON_HEIGHT = 68;

export const Container = styled(PressableArea)<ContainerProps>`
  padding: ${(props) => props.theme.spacing[4]}px;
  border-radius: ${(props) => props.theme.radii.md}px;
  justify-content: center;
  align-items: center;

  overflow: hidden;
  height: ${BUTTON_HEIGHT}px;

  border-width: ${(props) => props.theme.stroke.xxl}px;
  border-color: ${(props) => props.theme.colors.primary};

  ${(props) =>
    props.variant !== "outline" &&
    css`
      background-color: ${props.theme.colors.primary};
    `}

  ${(props) =>
    props.disabled &&
    css`
      opacity: 0.5;
    `}
`;

export const ButtonText = styled(Text)<VariantProps>`
  color: ${(props) =>
    props.variant === "outline" ? props.theme.colors.primary : "white"};
`;
