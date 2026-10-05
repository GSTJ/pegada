import * as React from "react";
import type {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
  AccessibilityValue,
} from "react-native";
import { ReduceMotion, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import type { BlurEffectPolicy } from "@/components/BlurView";
import { Container, Content, Dot } from "./styles";

const PHOTO_ADJUST_ACTIONS: ReadonlyArray<AccessibilityActionInfo> = [
  { name: "increment" },
  { name: "decrement" },
];

const DotComponent: React.FC<{
  index: number;
  currentPage: number;
}> = ({ index, currentPage }) => {
  const active = index === currentPage;

  const style = useAnimatedStyle(() => {
    "worklet";
    const animation = { duration: 180, reduceMotion: ReduceMotion.System };

    return {
      opacity: withTiming(active ? 1 : 0.65, animation),
      transform: [{ scale: withTiming(active ? 1 : 0.75, animation) }],
    };
  });

  return <Dot accessible={false} style={style} />;
};

interface PaginationProps {
  blurEffectPolicy?: BlurEffectPolicy;
  pages: number;
  currentPage: number;
  onDecrement?: () => void;
  onIncrement?: () => void;
}

const Pagination: React.FC<PaginationProps> = ({
  blurEffectPolicy,
  pages,
  currentPage,
  onDecrement,
  onIncrement,
}) => {
  const { t } = useTranslation();
  const isAdjustable = Boolean(onDecrement && onIncrement);
  const position = t("photoPagination.position", {
    current: currentPage + 1,
    total: pages,
  });
  const accessibilityValue = React.useMemo<AccessibilityValue | undefined>(
    () =>
      isAdjustable
        ? {
            min: 1,
            max: pages,
            now: currentPage + 1,
            text: position,
          }
        : undefined,
    [currentPage, isAdjustable, pages, position],
  );
  const handleAccessibilityAction = React.useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "increment" && currentPage < pages - 1) {
        onIncrement?.();
      }

      if (event.nativeEvent.actionName === "decrement" && currentPage > 0) {
        onDecrement?.();
      }
    },
    [currentPage, onDecrement, onIncrement, pages],
  );

  if (pages <= 1) return null;

  return (
    <Container
      blurEffectPolicy={blurEffectPolicy}
      accessible={isAdjustable}
      accessibilityRole={isAdjustable ? "adjustable" : undefined}
      accessibilityLabel={isAdjustable ? t("photoPagination.label") : undefined}
      accessibilityValue={accessibilityValue}
      accessibilityActions={isAdjustable ? PHOTO_ADJUST_ACTIONS : undefined}
      accessibilityElementsHidden={!isAdjustable}
      importantForAccessibility={isAdjustable ? "yes" : "no-hide-descendants"}
      onAccessibilityAction={handleAccessibilityAction}
    >
      <Content accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: pages }).map((_, index) => (
          // Pages have no identity beyond their stable ordinal position.
          // eslint-disable-next-line react/no-array-index-key
          <DotComponent key={`${index}-dot`} index={index} currentPage={currentPage} />
        ))}
      </Content>
    </Container>
  );
};

export default Pagination;
