import type { LayoutChangeEvent, StyleProp, ViewStyle } from "react-native";

import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { View } from "react-native";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useDisableSwipeBack } from "@/hooks/use-disable-swipe-back";

// A photo settling into its new slot, or getting picked up — both should
// feel alive rather than mechanical, and retarget smoothly if a second drag
// starts before the first settle finishes.
const SLOT_SPRING = { duration: 260, dampingRatio: 0.8 } as const;
const LIFT_SPRING = { duration: 200, dampingRatio: 0.7 } as const;
const LIFT_SCALE = 1.05;
const PREVIEW_OPACITY = 0.24;
const PREVIEW_SCALE = 0.96;

export type DraggableItem = {
  id: string;
  disabledDrag?: boolean;
  disabledReSorted?: boolean;
};

export type DraggableGridProps<T extends DraggableItem> = {
  numColumns: number;
  data: T[];
  itemHeight: number;
  style?: StyleProp<ViewStyle>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragRelease?: (newData: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
};

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

// Long enough that an ordinary tap or scroll never gets mistaken for the
// start of a drag; short enough that intentionally holding a photo feels
// immediate.
const LONG_PRESS_DURATION_MS = 200;

const DraggableGridItem = <T extends DraggableItem>({
  item,
  index,
  numColumns,
  cellWidth,
  cellHeight,
  total,
  active,
  disabledDropIndices,
  onPreviewReorder,
  onDragStart,
  onDragEnd,
  renderItem,
}: {
  item: T;
  index: number;
  numColumns: number;
  cellWidth: number;
  cellHeight: number;
  total: number;
  active: boolean;
  disabledDropIndices: boolean[];
  onPreviewReorder: (fromIndex: number, toIndex: number) => void;
  onDragStart: (itemId: string, index: number) => void;
  onDragEnd: () => void;
  renderItem: (item: T) => React.ReactNode;
}) => {
  const initialX = (index % numColumns) * cellWidth;
  const initialY = Math.floor(index / numColumns) * cellHeight;
  const positionX = useSharedValue(initialX);
  const positionY = useSharedValue(initialY);
  const targetX = useSharedValue(initialX);
  const targetY = useSharedValue(initialY);
  const dragOriginX = useSharedValue(0);
  const dragOriginY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const liftScale = useSharedValue(1);
  // Worklets close over `index` at gesture-creation time; mirroring it into a
  // shared value keeps gesture callbacks reading the current slot even if a native
  // touch event is still in flight when a reorder shifts this item's index.
  const currentIndex = useSharedValue(index);

  // Every non-dragged item retargets as soon as the active photo crosses a
  // slot, so the grid previews the final order before the finger lifts.
  useEffect(() => {
    const nextX = (index % numColumns) * cellWidth;
    const nextY = Math.floor(index / numColumns) * cellHeight;
    currentIndex.value = index;
    targetX.value = nextX;
    targetY.value = nextY;
    if (!active) {
      positionX.value = withSpring(nextX, SLOT_SPRING);
      positionY.value = withSpring(nextY, SLOT_SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, numColumns, cellWidth, cellHeight]);

  const disabled = Boolean(item.disabledDrag);

  const drag = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_DURATION_MS)
    .enabled(!disabled)
    .onStart(() => {
      "worklet";
      isActive.value = true;
      dragOriginX.value = positionX.value;
      dragOriginY.value = positionY.value;
      liftScale.value = withSpring(LIFT_SCALE, LIFT_SPRING);
      runOnJS(onDragStart)(item.id, currentIndex.value);
    })
    .onUpdate((event) => {
      "worklet";
      const currentX = dragOriginX.value + event.translationX;
      const currentY = dragOriginY.value + event.translationY;
      positionX.value = currentX;
      positionY.value = currentY;

      const col = clamp(Math.round(currentX / cellWidth), 0, numColumns - 1);
      const row = Math.max(0, Math.round(currentY / cellHeight));
      const hoverIndex = clamp(row * numColumns + col, 0, total - 1);

      if (
        hoverIndex !== currentIndex.value &&
        !disabledDropIndices[hoverIndex]
      ) {
        const fromIndex = currentIndex.value;
        currentIndex.value = hoverIndex;
        targetX.value = (hoverIndex % numColumns) * cellWidth;
        targetY.value = Math.floor(hoverIndex / numColumns) * cellHeight;
        runOnJS(onPreviewReorder)(fromIndex, hoverIndex);
      }
    })
    .onFinalize(() => {
      "worklet";
      if (!isActive.value) return;
      isActive.value = false;
      positionX.value = withSpring(targetX.value, SLOT_SPRING);
      positionY.value = withSpring(targetY.value, SLOT_SPRING);
      liftScale.value = withSpring(1, LIFT_SPRING);
      runOnJS(onDragEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: cellWidth,
    height: cellHeight,
    transform: [
      { translateX: positionX.value },
      { translateY: positionY.value },
      { scale: liftScale.value },
    ],
    zIndex: isActive.value ? 10 : 0,
    elevation: isActive.value ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={animatedStyle}>{renderItem(item)}</Animated.View>
    </GestureDetector>
  );
};

const DropPreview = <T extends DraggableItem>({
  item,
  index,
  numColumns,
  cellWidth,
  cellHeight,
  renderItem,
}: {
  item: T;
  index: number;
  numColumns: number;
  cellWidth: number;
  cellHeight: number;
  renderItem: (item: T) => React.ReactNode;
}) => {
  const x = useSharedValue((index % numColumns) * cellWidth);
  const y = useSharedValue(Math.floor(index / numColumns) * cellHeight);

  useEffect(() => {
    x.value = withSpring((index % numColumns) * cellWidth, SLOT_SPRING);
    y.value = withSpring(
      Math.floor(index / numColumns) * cellHeight,
      SLOT_SPRING,
    );
  }, [cellHeight, cellWidth, index, numColumns, x, y]);

  const style = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    top: 0,
    width: cellWidth,
    height: cellHeight,
    opacity: PREVIEW_OPACITY,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: PREVIEW_SCALE },
    ],
    zIndex: 5,
    elevation: 5,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      {renderItem(item)}
    </Animated.View>
  );
};

export const DraggableGrid = <T extends DraggableItem>({
  numColumns,
  data,
  itemHeight,
  style,
  onDragStart,
  onDragEnd,
  onDragRelease,
  renderItem,
}: DraggableGridProps<T>) => {
  const [items, setItems] = useState(data);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  const didReorderRef = useRef(false);
  const itemsRef = useRef(data);
  const setSwipeBackEnabled = useDisableSwipeBack();

  // Reflects upstream data changes (an upload finishing, a delete) as long as
  // none of that is a side effect of a drag this grid is mid-way through —
  // resyncing then would yank an item out from under the user's finger.
  useEffect(() => {
    if (!isDraggingRef.current) {
      itemsRef.current = data;
      setItems(data);
    }
  }, [data]);

  const handleDragStart = (itemId: string, index: number) => {
    isDraggingRef.current = true;
    didReorderRef.current = false;
    setActiveItemId(itemId);
    setPreviewIndex(index);
    setSwipeBackEnabled(false);
    onDragStart?.();
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setSwipeBackEnabled(true);
    onDragEnd?.();
    setActiveItemId(null);
    setPreviewIndex(null);
    if (didReorderRef.current) onDragRelease?.(itemsRef.current);
  };

  const handlePreviewReorder = (fromIndex: number, toIndex: number) => {
    const { current } = itemsRef;
    const inRange = (i: number) => i >= 0 && i < current.length;
    if (
      toIndex === fromIndex ||
      !inRange(fromIndex) ||
      !inRange(toIndex) ||
      current[toIndex]?.disabledReSorted
    ) {
      return;
    }

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);

    didReorderRef.current = true;
    itemsRef.current = next;
    setItems(next);
    setPreviewIndex(toIndex);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const cellWidth = containerWidth / numColumns;
  const rows = Math.ceil(items.length / numColumns);
  const activeItem = items.find((item) => item.id === activeItemId);
  const disabledDropIndices = items.map((item) =>
    Boolean(item.disabledReSorted),
  );

  return (
    <View
      style={[style, { height: rows * itemHeight }]}
      onLayout={handleLayout}
    >
      {containerWidth > 0 && activeItem && previewIndex !== null ? (
        <DropPreview
          item={activeItem}
          index={previewIndex}
          numColumns={numColumns}
          cellWidth={cellWidth}
          cellHeight={itemHeight}
          renderItem={renderItem}
        />
      ) : null}
      {containerWidth > 0
        ? items.map((item, index) => (
            <DraggableGridItem
              key={item.id}
              item={item}
              index={index}
              numColumns={numColumns}
              cellWidth={cellWidth}
              cellHeight={itemHeight}
              total={items.length}
              active={activeItemId === item.id}
              disabledDropIndices={disabledDropIndices}
              onPreviewReorder={handlePreviewReorder}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
            />
          ))
        : null}
    </View>
  );
};
