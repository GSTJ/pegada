import styled from "styled-components/native";

import {
  OfflineComponent,
  UnknownErrorComponent
} from "@/components/NetworkBoundary";

export const ProfileContainer = styled.View`
  justify-content: center;
  align-items: center;
  background-color: ${({ theme }) => theme.colors.card};
`;

export const ProfileOfflineError = styled(OfflineComponent)`
  background-color: ${({ theme }) => theme.colors.card};
`;

export const ProfileUnknownError = styled(UnknownErrorComponent)`
  background-color: ${({ theme }) => theme.colors.card};
`;
