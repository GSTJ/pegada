import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

import { PressableArea } from "@/components/pressable-area";

export const Container = styled(SafeAreaView).attrs({
  edges: ["left", "right"],
})`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;

/** The "change location" pill above the card stack. */
export const LocationButton = styled(PressableArea)`
  padding: ${({ theme }) => theme.spacing[2]}px;
  flex-direction: row;
  align-items: center;
  align-self: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]}px;
`;
