import styled from "styled-components/native";

import { Image } from "@/components/Image";

export const Container = styled.ScrollView`
  flex-grow: 1;
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
