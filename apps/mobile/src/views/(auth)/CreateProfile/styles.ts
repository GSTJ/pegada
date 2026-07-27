import styled from "styled-components/native";

import { Input } from "@/components/Input";
import { Text } from "@/components/text";

export const Container = styled.ScrollView`
  flex: 1;
`;

export const PhotoHint = styled(Text)`
  margin-bottom: 10px;
`;

export const DragHint = styled(Text)`
  margin-top: 5px;
`;

export const MultilineInput = styled(Input)`
  min-height: 75px;
`;
