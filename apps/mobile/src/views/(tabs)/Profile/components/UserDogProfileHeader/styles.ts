import { LinearGradient } from "expo-linear-gradient";

import styled from "styled-components/native";

import * as PersonalInfo from "@/components/MainCard/components/PersonalInfo/styles";
import { Container } from "@/components/MainCard/styles";
import {
  OfflineComponent,
  UnknownErrorComponent,
} from "@/components/NetworkBoundary";

/** The MainCard shell, squared off because it sits flush under the header. */
export const HeaderCard = styled(Container)`
  border-radius: 0;
`;

/** Bottom-anchored gradient the name and bio sit on top of. */
export const Shade = styled(LinearGradient)`
  margin-top: auto;
`;

/** Top-anchored gradient that darkens the status bar area. */
export const Scrim = styled(LinearGradient)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

export const InfoBlock = styled(PersonalInfo.Container)`
  padding-bottom: 35px;
`;

export const NameRow = styled.View`
  flex-direction: row;
  align-items: center;
`;

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
