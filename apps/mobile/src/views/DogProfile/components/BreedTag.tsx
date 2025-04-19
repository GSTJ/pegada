import { View } from "react-native";
import { useTranslation } from "react-i18next";
import styled from "styled-components/native";

import { BreedSlug } from "@pegada/shared/i18n/i18n";
import { Namespace } from "@pegada/shared/i18n/types/types";

import Glassmorphism from "@/components/Glassmorphism";
import { Text } from "@/components/Text";
import { SwipeDog } from "@/store/reducers/dogs/swipe";

const GlassmorphismStyled = styled(Glassmorphism)`
  border-radius: ${(props) => props.theme.radii.md}px;
  margin-right: auto;
  margin-bottom: ${(props) => props.theme.spacing[3]}px;
  border-width: ${(props) => props.theme.stroke.sm}px;
  border-color: ${(props) => props.theme.colors.border};
`;

const ViewStyled = styled(View)`
  padding: ${(props) => props.theme.spacing[2]}px
    ${(props) => props.theme.spacing[4]}px;
  padding-bottom: ${(props) => props.theme.spacing[2.5]}px;
`;

export const BreedTag = (props: { breed: SwipeDog["breed"] }) => {
  const { t } = useTranslation(Namespace.Breed);

  if (!props.breed?.slug) return null;

  return (
    <GlassmorphismStyled>
      <ViewStyled>
        <Text fontWeight="medium">{t(props.breed.slug as BreedSlug)}</Text>
      </ViewStyled>
    </GlassmorphismStyled>
  );
};
