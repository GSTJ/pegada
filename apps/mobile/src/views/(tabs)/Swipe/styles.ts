import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

export const Container = styled(SafeAreaView).attrs({
  edges: ["left", "right"]
})`
  flex: 1;
  background-color: ${(props) => props.theme.colors.background};
`;
