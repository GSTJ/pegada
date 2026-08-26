import { StyleSheet } from "react-native";

import styled from "styled-components/native";

import Information from "@/assets/images/Information.svg";
import Location from "@/assets/images/Location.svg";
import { Text } from "@/components/text";

/**
 * `contentContainerStyle` is a plain style prop, not a component, so it cannot
 * be a styled component — the only way to keep it out of the JSX is a sheet.
 */
export const { scrollContent } = StyleSheet.create({
  scrollContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

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

export const LocationIcon = styled(Location)`
  margin-bottom: 20px;
`;

export const InformationIcon = styled(Information)`
  width: 21px;
  height: 21px;
  margin-right: 10px;
`;

export const Title = styled(Text)`
  text-align: center;
  margin-bottom: 4px;
`;

export const Prompt = styled(Text)`
  text-align: center;
`;
