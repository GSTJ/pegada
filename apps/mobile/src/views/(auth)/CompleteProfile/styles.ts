import styled from "styled-components/native";

import { Image } from "@/components/image";
import { Text } from "@/components/text";

export const Container = styled.ScrollView`
  flex: 1;
`;

/** The wider half of the breed / birth-date row. */
export const WideColumn = styled.View`
  flex: 1.5;
`;

/** The fixed gutter between two fields sharing a row. */
export const Gap = styled.View`
  width: ${({ theme }) => theme.spacing[3]}px;
`;

export const Note = styled(Text)`
  margin-top: ${({ theme }) => theme.spacing[6]}px;
`;

export const ImageContainer = styled.View`
  padding: ${(props) => props.theme.spacing[1]}px;
  border-width: ${(props) => props.theme.spacing[1]}px;
  border-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${(props) => props.theme.radii.round}px;
  align-self: center;
  margin-top: ${(props) => props.theme.spacing[4]}px;
  margin-bottom: ${(props) => props.theme.spacing[2]}px;
`;

export const ProfileImage = styled(Image)`
  height: 150px;
  width: 150px;
  border-radius: ${(props) => props.theme.radii.round}px;
`;
