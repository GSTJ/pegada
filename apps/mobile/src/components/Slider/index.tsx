import type {
  LabelProps,
  MultiSliderProps,
} from "@ptomasroos/react-native-multi-slider";

import * as React from "react";
import { View } from "react-native";

import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { useUnistyles } from "react-native-unistyles";

import { Text } from "@/components/text";
import { useDisableSwipeBack } from "@/hooks/use-disable-swipe-back";

import { WIDTH, styles } from "./styles";

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

const CustomMarker = () => (
  <View hitSlop={markerHitSlop} style={styles.marker} />
);

/**
 * Hoisted out of `Root` so it keeps its identity between renders — a component
 * declared during render remounts its subtree every time the parent updates.
 * `max` comes in as a prop instead of a closure variable.
 */
const CustomLabels = ({ max, ...label }: LabelProps & { max: number }) => {
  const oneMarkerValue =
    Number(label.oneMarkerValue) >= max ? "∞" : label.oneMarkerValue;
  const twoMarkerValue =
    Number(label.twoMarkerValue) >= max ? "∞" : label.twoMarkerValue;

  return (
    <>
      {Number(label.oneMarkerValue) >= 0 && (
        <CustomLabel left={label.oneMarkerLeftPosition}>
          {oneMarkerValue}
        </CustomLabel>
      )}
      {Number(label.twoMarkerValue) >= 0 && (
        <CustomLabel left={label.twoMarkerLeftPosition}>
          {twoMarkerValue}
        </CustomLabel>
      )}
    </>
  );
};

export const Root = (props: MultiSliderProps) => {
  const { theme } = useUnistyles();
  const setSwipeBackEnabled = useDisableSwipeBack();

  // When the slider reaches the edge of the screen, a horizontal drag there
  // gets claimed by the OS navigation gesture (iOS interactive pop / Android
  // system back) instead of the slider, sending the user back a screen. Inset
  // the track on both platforms so no marker sits in that edge gesture zone.
  const sliderLength = (props?.sliderLength ?? 0) - theme.spacing[7] * 2;

  // The edge inset above only softens the conflict — a drag that starts
  // mid-track and moves the finger toward either edge still races the
  // screen's swipe-back gesture. Turn the stack's gesture off for as long
  // as a drag is in progress so the slider always wins.
  const handleDragStart = () => {
    setSwipeBackEnabled(false);
    props.onValuesChangeStart?.();
  };

  const handleDragFinish = (values: number[]) => {
    setSwipeBackEnabled(true);
    props.onValuesChangeFinish?.(values);
  };

  const max = props.max ?? 0;
  const renderCustomLabels = React.useCallback(
    (label: LabelProps) => <CustomLabels {...label} max={max} />,
    [max],
  );

  const hasSecondMarker = (props.values?.length ?? 0) > 1;

  const stroke = 3;

  const safeBorderStyle = {
    height: stroke,
    width: theme.spacing[7],
    backgroundColor: theme.colors.border,
    zIndex: -1,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md,
  };

  const style = {
    flexDirection: "row",
    alignItems: "center",
  } as const;

  const trackStyle = {
    backgroundColor: theme.colors.border,
    height: stroke,
  };
  const selectedStyle = {
    backgroundColor: theme.colors.primary,
  };
  return (
    <View style={style}>
      <View
        style={[
          safeBorderStyle,
          {
            backgroundColor: hasSecondMarker
              ? theme.colors.border
              : theme.colors.primary,
          },
        ]}
      />
      <MultiSlider
        enableLabel
        customLabel={renderCustomLabels}
        customMarker={CustomMarker}
        trackStyle={trackStyle}
        selectedStyle={selectedStyle}
        {...props}
        onValuesChangeStart={handleDragStart}
        onValuesChangeFinish={handleDragFinish}
        max={props.max ? props.max + 1 : props.max}
        sliderLength={sliderLength}
      />
      <View style={safeBorderStyle} />
    </View>
  );
};

export const Slider = {
  Root,
  Title,
  Label: CustomLabel,
};
