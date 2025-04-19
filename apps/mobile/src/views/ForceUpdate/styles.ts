import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";

import { Text } from "@/components/Text";

export const Container = styled(SafeAreaView)`
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]}px;
  flex: 1;
`;

export const CenterText = styled(Text)`
  text-align: center;
`;
