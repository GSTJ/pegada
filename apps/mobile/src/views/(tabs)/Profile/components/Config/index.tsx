import { useTheme } from "styled-components/native";

import ArrowRight from "@/assets/images/ArrowRight.svg";

import {
  ArrowContainer,
  Container,
  Description,
  IconSlot,
  Root,
  Title,
} from "./styles";

const Arrow = () => {
  const theme = useTheme();

  return (
    <ArrowContainer>
      <ArrowRight width={12} height={12} color={theme.colors.text} />
    </ArrowContainer>
  );
};
export const Config = {
  Container,
  IconSlot,
  Description,
  Root,
  Title,
  Arrow,
};
