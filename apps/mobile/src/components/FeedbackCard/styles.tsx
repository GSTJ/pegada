import type { VisitingCardProps } from "../MainCard";
import type { AnimatedProps } from "react-native-reanimated";

import type { ViewProps } from "react-native";

import Animated from "react-native-reanimated";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

import MainCard from "../MainCard";
import { absoluteFill } from "../MainCard/styles";

/** A card is a composite, not a host component: it needs wrapping. */
const ThemedMainCard = withUnistyles(MainCard);

type ContainerProps = {
  isFirst: boolean;
} & AnimatedProps<ViewProps>;

/**
 * The top card of the deck carries the shadow. `FeedbackCard` hands the flag
 * in as a prop, so it selects a variant here rather than at the call site.
 */
export const Container = ({ isFirst, style, ...props }: ContainerProps) => {
  styles.useVariants({ isFirst });

  return <Animated.View {...props} style={[styles.container, style]} />;
};

/**
 * `.attrs` spread `...props` last, so a caller's `pointerEvents` won — hence
 * the default sitting before the spread. The animated opacity arrives through
 * `style` and has to stay last.
 */
export const AbsolutePosition = ({
  style,
  ...props
}: AnimatedProps<ViewProps>) => (
  <Animated.View
    pointerEvents="none"
    {...props}
    style={[styles.absolutePosition, style]}
  />
);

export const StyledMainCard = ({ style, ...props }: VisitingCardProps) => (
  <ThemedMainCard {...props} style={[styles.styledMainCard, style]} />
);

const CONTAINER_SHADOW_COLOR = "#000";

const styles = StyleSheet.create((theme) => ({
  container: {
    marginTop: theme.spacing[1],
    marginRight: theme.spacing[1.5],
    marginBottom: theme.spacing[1],
    marginLeft: theme.spacing[1.5],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    borderBottomLeftRadius: theme.radii.lg,
    backgroundColor: theme.colors.background,
    overflow: "hidden",
    variants: {
      isFirst: {
        true: {
          elevation: 0.5,
          shadowColor: CONTAINER_SHADOW_COLOR,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 1,
        },
      },
    },
  },
  absolutePosition: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    ...absoluteFill,
  },
  styledMainCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
}));
