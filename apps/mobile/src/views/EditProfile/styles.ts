import styled from "styled-components/native";

import { Input } from "@/components/Input";

export const Container = styled.ScrollView`
  flex: 1;
`;

/** The wider half of the weight / birth-date row. */
export const WideColumn = styled.View`
  flex: 1.5;
`;

/** The fixed gutter between two fields sharing a row. */
export const Gap = styled.View`
  width: ${({ theme }) => theme.spacing[3]}px;
`;

export const MultilineInput = styled(Input)`
  min-height: 75px;
`;
