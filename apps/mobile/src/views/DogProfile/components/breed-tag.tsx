import type { SwipeDog } from "@/store/reducers/dogs/swipe";
import type { BreedSlug } from "@pegada/shared/i18n/i18n";

import { View } from "react-native";

import { Namespace } from "@pegada/shared/i18n/types/types";
import { useTranslation } from "react-i18next";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import Glassmorphism from "@/components/Glassmorphism";
import { Text } from "@/components/text";

export const BreedTag = (props: { breed: SwipeDog["breed"] }) => {
  const { t } = useTranslation(Namespace.Breed);

  if (!props.breed?.slug) return null;

  return (
    <GlassmorphismStyled style={styles.glassmorphismStyled}>
      <View style={styles.viewStyled}>
        <Text fontWeight="medium">{t(props.breed.slug as BreedSlug)}</Text>
      </View>
    </GlassmorphismStyled>
  );
};

const styles = StyleSheet.create((theme) => ({
  glassmorphismStyled: {
    borderTopLeftRadius: theme.radii.md,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
    borderBottomLeftRadius: theme.radii.md,
    marginRight: "auto",
    marginBottom: theme.spacing[3],
    borderWidth: theme.stroke.sm,
    borderColor: theme.colors.border,
  },
  viewStyled: {
    paddingTop: theme.spacing[2],
    paddingRight: theme.spacing[4],
    paddingBottom: theme.spacing[2.5],
    paddingLeft: theme.spacing[4],
  },
}));

const GlassmorphismStyled = withUnistyles(Glassmorphism);
