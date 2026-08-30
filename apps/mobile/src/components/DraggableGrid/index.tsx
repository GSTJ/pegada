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
  onReorder,
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
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  renderItem: (item: T) => React.ReactNode;
}) => {
  const restX = useSharedValue((index % numColumns) * cellWidth);
  const restY = useSharedValue(Math.floor(index / numColumns) * cellHeight);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isActive = useSharedValue(false);
  const liftScale = useSharedValue(1);
  // Worklets close over `index` at gesture-creation time; mirroring it into a
  // shared value keeps onEnd reading the current slot even if a native
  // touch event is still in flight when a reorder shifts this item's index.
  const currentIndex = useSharedValue(index);

  // Slots stay put while an item settles into a new position after a drop
  // elsewhere in the grid — only the coordinates change, not by a gesture on
  // this cell.
  useEffect(() => {
    currentIndex.value = index;
    restX.value = withSpring((index % numColumns) * cellWidth, SLOT_SPRING);
    restY.value = withSpring(
      Math.floor(index / numColumns) * cellHeight,
      SLOT_SPRING,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, numColumns, cellWidth, cellHeight]);

  const disabled = Boolean(item.disabledDrag);

  const longPress = Gesture.LongPress()
    .minDuration(LONG_PRESS_DURATION_MS)
    .maxDistance(100000) // effectively unbounded — a real drag moves well past gesture-handler's ~10pt default and shouldn't cancel the hold
    .enabled(!disabled)
    .onStart(() => {
      "worklet";
      isActive.value = true;
      liftScale.value = withSpring(LIFT_SCALE, LIFT_SPRING);
      runOnJS(onDragStart)();
    })
    .onFinalize(() => {
      "worklet";
      // A tap that never reaches the long-press threshold still finalizes —
      // only fire onDragEnd (and unwind the lift) if a drag actually started.
      if (!isActive.value) return;
      isActive.value = false;
      liftScale.value = withSpring(1, LIFT_SPRING);
      runOnJS(onDragEnd)();
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .enabled(!disabled)
    .onTouchesMove((_event, state) => {
      "worklet";
      if (isActive.value) state.activate();
      else state.fail();
    })
    .onUpdate((event) => {
      "worklet";
      dragX.value = event.translationX;
      dragY.value = event.translationY;
    })
    .onEnd((event) => {
      "worklet";
      const currentX = restX.value + event.translationX;
      const currentY = restY.value + event.translationY;
      const col = clamp(Math.round(currentX / cellWidth), 0, numColumns - 1);
      const row = Math.max(0, Math.round(currentY / cellHeight));
      const hoverIndex = clamp(row * numColumns + col, 0, total - 1);
      runOnJS(onReorder)(currentIndex.value, hoverIndex);
    })
    .onFinalize(() => {
      "worklet";
      dragX.value = withSpring(0, SLOT_SPRING);
      dragY.value = withSpring(0, SLOT_SPRING);
    });

  const composedGesture = Gesture.Simultaneous(longPress, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: restX.value,
    top: restY.value,
    width: cellWidth,
    height: cellHeight,
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: liftScale.value },
    ],
    zIndex: isActive.value ? 10 : 0,
    elevation: isActive.value ? 10 : 0,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={animatedStyle}>{renderItem(item)}</Animated.View>
    </GestureDetector>
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
  const isDraggingRef = useRef(false);
  const setSwipeBackEnabled = useDisableSwipeBack();

  // Reflects upstream data changes (an upload finishing, a delete) as long as
  // none of that is a side effect of a drag this grid is mid-way through —
  // resyncing then would yank an item out from under the user's finger.
  useEffect(() => {
    if (!isDraggingRef.current) setItems(data);
  }, [data]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    setSwipeBackEnabled(false);
    onDragStart?.();
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setSwipeBackEnabled(true);
    onDragEnd?.();
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    let reordered: T[] | null = null;

    setItems((prev) => {
      const inRange = (i: number) => i >= 0 && i < prev.length;
      if (
        toIndex === fromIndex ||
        !inRange(fromIndex) ||
        !inRange(toIndex) ||
        prev[toIndex]?.disabledReSorted
      ) {
        return prev;
      }

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);

      reordered = next;
      return next;
    });

    if (reordered) onDragRelease?.(reordered);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const cellWidth = containerWidth / numColumns;
  const rows = Math.ceil(items.length / numColumns);

  return (
    <View
      style={[style, { height: rows * itemHeight }]}
      onLayout={handleLayout}
    >
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
              onReorder={handleReorder}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              renderItem={renderItem}
            />
          ))
        : null}
    </View>
  );
};
