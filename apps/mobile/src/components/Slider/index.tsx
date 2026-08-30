import type { SharedValue } from "react-native-reanimated";

import { useEffect, useRef } from "react";
import * as React from "react";
import { View } from "react-native";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Text } from "@/components/text";
import { useDisableSwipeBack } from "@/hooks/use-disable-swipe-back";

import { MARKER_SIZE, WIDTH, styles } from "./styles";

// Crisp, no-bounce settle for values that change programmatically (filters
// syncing from elsewhere) — a spring retargets smoothly if a value change
// arrives mid-animation, unlike a restarting keyframe/timing animation.
const SETTLE_SPRING = { duration: 220, dampingRatio: 1 } as const;
// Snappier, slightly springy press feedback confirming the marker was grabbed.
const PRESS_SPRING = { duration: 150, dampingRatio: 0.9 } as const;
const PRESS_SCALE = 0.97;

type TitleProps = {
  title: string;
  subtitle: string;
};

const Title: React.FC<TitleProps> = ({ title, subtitle }) => (
  <View style={styles.titleContainer}>
    <Text fontWeight="bold" fontSize="lg">
      {title}
    </Text>
    <Text fontWeight="bold" fontSize="lg">
      {subtitle}
    </Text>
  </View>
);

type CustomLabelProps = {
  left: number;
  children: string | number;
};

const CustomLabel: React.FC<CustomLabelProps> = ({ left, children }) => {
  // Makes the label text more optically center aligned
  const ADJUSTMENT_PADDING = 3;

  return (
    <View
      style={[
        styles.labelContainer,
        {
          left: left - WIDTH / 2,
          paddingBottom: ADJUSTMENT_PADDING,
        },
      ]}
    >
      <Text color="background" fontWeight="semibold">
        {children}
      </Text>
      <View style={styles.triangle} />
    </View>
  );
};

const markerHitSlop = {
  top: 15,
  bottom: 15,
  left: 15,
  right: 15,
};

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

const valueToPosition = (
  value: number,
  min: number,
  max: number,
  sliderLength: number,
) => {
  "worklet";
  if (max === min) return 0;
  // A value outside [min, max] — e.g. data saved before MAX_FILTER_AGE was
  // tightened — must not push the marker off the visible track.
  return clamp(((value - min) / (max - min)) * sliderLength, 0, sliderLength);
};

const positionToValue = (
  position: number,
  min: number,
  max: number,
  sliderLength: number,
  step: number,
) => {
  "worklet";
  // Visual ends must map to the real min / expanded max even when `step`
  // does not divide (max - min) — e.g. distance min=1 max=301 step=5.
  // Without this, the last notch (infinity) is unreachable and the thumb
  // sits short of the right cap.
  if (sliderLength <= 0 || position <= 0) return min;
  if (position >= sliderLength) return max;
  const raw = min + (position / sliderLength) * (max - min);
  const snapped = Math.round(raw / step) * step;
  return clamp(snapped, min, max);
};

const labelText = (value: number, max: number) =>
  value >= max ? "∞" : String(value);

type MarkerProps = {
  position: SharedValue<number>;
  min: number;
  max: number;
  sliderLength: number;
  step: number;
  lowerBound: SharedValue<number> | number;
  upperBound: SharedValue<number> | number;
  onDragStart: () => void;
  onDragUpdate: (value: number) => void;
  onDragFinish: (value: number) => void;
};

const Marker = ({
  position,
  min,
  max,
  sliderLength,
  step,
  lowerBound,
  upperBound,
  onDragStart,
  onDragUpdate,
  onDragFinish,
}: MarkerProps) => {
  const setSwipeBackEnabled = useDisableSwipeBack();
  const startPosition = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const gesture = Gesture.Pan()
    .onTouchesDown(() => {
      "worklet";
      // Disabled the instant a finger lands on the marker, before any
      // movement is even measured — the stack's own swipe-back recognizer
      // races on movement too, and waiting for a drag threshold to fire
      // first is exactly what let it win sometimes.
      runOnJS(setSwipeBackEnabled)(false);
      startPosition.value = position.value;
      pressScale.value = withSpring(PRESS_SCALE, PRESS_SPRING);
    })
    .onStart(() => {
      "worklet";
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      "worklet";
      const lower =
        typeof lowerBound === "number" ? lowerBound : lowerBound.value;
      const upper =
        typeof upperBound === "number" ? upperBound : upperBound.value;
      const rawPosition = clamp(
        startPosition.value + event.translationX,
        lower,
        upper,
      );
      const value = positionToValue(rawPosition, min, max, sliderLength, step);
      position.value = valueToPosition(value, min, max, sliderLength);
      runOnJS(onDragUpdate)(value);
    })
    .onFinalize(() => {
      "worklet";
      const value = positionToValue(
        position.value,
        min,
        max,
        sliderLength,
        step,
      );
      pressScale.value = withSpring(1, PRESS_SPRING);
      runOnJS(setSwipeBackEnabled)(true);
      runOnJS(onDragFinish)(value);
    });

  const markerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: position.value - MARKER_SIZE / 2 },
      // Optically centers the ring on the track — matches the 2.3pt border
      // eating slightly into the marker's own bounding box.
      { translateY: 1 },
      { scale: pressScale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        hitSlop={markerHitSlop}
        style={[styles.marker, styles.markerPositioner, markerStyle]}
      />
    </GestureDetector>
  );
};

export type MultiSliderProps = {
  values: number[];
  min?: number;
  max?: number;
  step?: number;
  sliderLength?: number;
  onValuesChange?: (values: number[]) => void;
  onValuesChangeStart?: () => void;
  onValuesChangeFinish?: (values: number[]) => void;
};

type LastEmittedRef = React.RefObject<number[] | null>;

/**
 * True when `values` isn't this slider's own echo AND we've already emitted
 * at least one local change — i.e. a parent re-render (a stale hydrate, a
 * refetch) is trying to clobber an in-progress edit rather than reflect it.
 */
const isStaleExternalReset = (
  lastEmittedRef: LastEmittedRef,
  values: number[],
) => {
  const last = lastEmittedRef.current;
  if (last === null) return false;
  return last[0] !== values[0] || last[1] !== values[1];
};

const CustomSlider = ({
  values,
  min = 0,
  max = 0,
  step = 1,
  sliderLength = 0,
  onValuesChange,
  onValuesChangeStart,
  onValuesChangeFinish,
  lastEmittedRef,
}: MultiSliderProps & { lastEmittedRef: LastEmittedRef }) => {
  const hasSecondMarker = values.length > 1;

  const positionA = useSharedValue(
    valueToPosition(values[0] ?? min, min, max, sliderLength),
  );
  const positionB = useSharedValue(
    valueToPosition(values[1] ?? min, min, max, sliderLength),
  );

  const isDraggingRef = useRef(false);
  const currentValuesRef = useRef(values);
  currentValuesRef.current = values;

  useEffect(() => {
    if (isDraggingRef.current) return;
    if (isStaleExternalReset(lastEmittedRef, values)) return;
    positionA.value = withSpring(
      valueToPosition(values[0] ?? min, min, max, sliderLength),
      SETTLE_SPRING,
    );
    if (hasSecondMarker) {
      positionB.value = withSpring(
        valueToPosition(values[1] ?? min, min, max, sliderLength),
        SETTLE_SPRING,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values[0], values[1], min, max, sliderLength]);

  const handleDragStart = () => {
    isDraggingRef.current = true;
    onValuesChangeStart?.();
  };

  const handleChangeA = (value: number) => {
    const next = hasSecondMarker
      ? [value, currentValuesRef.current[1] ?? value]
      : [value];
    onValuesChange?.(next);
  };

  const handleChangeB = (value: number) => {
    const next = [currentValuesRef.current[0] ?? min, value];
    onValuesChange?.(next);
  };

  const handleFinishA = (value: number) => {
    isDraggingRef.current = false;
    const next = hasSecondMarker
      ? [value, currentValuesRef.current[1] ?? value]
      : [value];
    onValuesChangeFinish?.(next);
  };

  const handleFinishB = (value: number) => {
    isDraggingRef.current = false;
    const next = [currentValuesRef.current[0] ?? min, value];
    onValuesChangeFinish?.(next);
  };

  const trackAnimatedStyle = useAnimatedStyle(() => {
    const left = hasSecondMarker ? positionA.value : 0;
    const width = hasSecondMarker
      ? positionB.value - positionA.value
      : positionA.value;
    return { left, width };
  });

  return (
    <View style={[styles.sliderContainer, { width: sliderLength }]}>
      <View style={styles.trackLine} />
      <Animated.View style={[styles.sliderSelected, trackAnimatedStyle]} />
      <Marker
        position={positionA}
        min={min}
        max={max}
        sliderLength={sliderLength}
        step={step}
        lowerBound={0}
        upperBound={hasSecondMarker ? positionB : sliderLength}
        onDragStart={handleDragStart}
        onDragUpdate={handleChangeA}
        onDragFinish={handleFinishA}
      />
      {hasSecondMarker ? (
        <Marker
          position={positionB}
          min={min}
          max={max}
          sliderLength={sliderLength}
          step={step}
          lowerBound={positionA}
          upperBound={sliderLength}
          onDragStart={handleDragStart}
          onDragUpdate={handleChangeB}
          onDragFinish={handleFinishB}
        />
      ) : null}
    </View>
  );
};

export const Root = (props: MultiSliderProps) => {
  const setSwipeBackEnabled = useDisableSwipeBack();

  // A drag that starts mid-track and moves the finger toward either edge
  // still races the screen's own swipe-back gesture. Marker's own
  // onTouchesDown (see above) already disables it the instant a finger lands
  // on a marker; this keeps it off for the full duration of the drag too.
  const handleDragStart = () => {
    setSwipeBackEnabled(false);
    props.onValuesChangeStart?.();
  };

  const handleDragFinish = (values: number[]) => {
    setSwipeBackEnabled(true);
    props.onValuesChangeFinish?.(values);
  };

  const max = props.max ?? 0;
  // One notch past the nominal max represents "no limit" — CustomLabel/label
  // text renders it as "∞" (see labelText). The slider's own range extends
  // to match so that notch is reachable.
  const expandedMax = props.max ? props.max + 1 : max;

  return (
    <SliderWithLabels
      {...props}
      onValuesChangeStart={handleDragStart}
      onValuesChangeFinish={handleDragFinish}
      max={expandedMax}
    />
  );
};

/**
 * Wraps `CustomSlider` to render the value bubble(s) below each marker,
 * outside the track's own clipping so the bubble's shadow isn't cut off.
 */
const SliderWithLabels = (props: MultiSliderProps) => {
  const { min = 0, max = 0, sliderLength = 0, values } = props;
  const hasSecondMarker = values.length > 1;

  const [displayValues, setDisplayValues] = React.useState(values);

  // Shared with CustomSlider below so both the bubble text and the marker
  // position agree on whether an incoming `values` update is this slider's
  // own echo or a stale reset trying to clobber an in-progress edit.
  const lastEmittedRef = useRef<number[] | null>(null);

  useEffect(() => {
    if (isStaleExternalReset(lastEmittedRef, values)) return;
    setDisplayValues(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values[0], values[1]]);

  return (
    <View style={styles.sliderWrapper}>
      <CustomSlider
        {...props}
        lastEmittedRef={lastEmittedRef}
        onValuesChange={(next) => {
          lastEmittedRef.current = next;
          setDisplayValues(next);
          props.onValuesChange?.(next);
        }}
      />
      {displayValues[0] !== undefined && (
        <CustomLabel
          left={valueToPosition(displayValues[0], min, max, sliderLength)}
        >
          {labelText(displayValues[0], max)}
        </CustomLabel>
      )}
      {hasSecondMarker && displayValues[1] !== undefined && (
        <CustomLabel
          left={valueToPosition(displayValues[1], min, max, sliderLength)}
        >
          {labelText(displayValues[1], max)}
        </CustomLabel>
      )}
    </View>
  );
};

export const Slider = {
  Root,
  Title,
  Label: CustomLabel,
};
