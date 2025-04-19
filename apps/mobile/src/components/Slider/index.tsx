import * as React from "react";
import { Platform, View } from "react-native";
import MultiSlider, {
  LabelProps,
  MultiSliderProps
} from "@ptomasroos/react-native-multi-slider";
import { useTheme } from "styled-components/native";

import { Text } from "@/components/Text";
import {
  LabelContainer,
  Marker,
  TitleContainer,
  Triangle,
  WIDTH
} from "./styles";

interface TitleProps {
  title: string;
  subtitle: string;
}

const Title: React.FC<TitleProps> = ({ title, subtitle }) => (
  <TitleContainer>
    <Text fontWeight="bold" fontSize="lg">
      {title}
    </Text>
    <Text fontWeight="bold" fontSize="lg">
      {subtitle}
    </Text>
  </TitleContainer>
);

interface CustomLabelProps {
  left: number;
  children: string | number;
}

const CustomLabel: React.FC<CustomLabelProps> = ({ left, children }) => {
  // Makes the label text more optically center aligned
  const ADJUSTMENT_PADDING = 3;

  return (
    <LabelContainer
      style={{
        left: left - WIDTH / 2,
        paddingBottom: ADJUSTMENT_PADDING
      }}
    >
      <Text color="background" fontWeight="semibold">
        {children}
      </Text>
      <Triangle />
    </LabelContainer>
  );
};

const markerHitSlop = {
  top: 15,
  bottom: 15,
  left: 15,
  right: 15
};

const CustomMarker = () => <Marker hitSlop={markerHitSlop} />;

export const Root = (props: MultiSliderProps) => {
  const theme = useTheme();

  // On android, if the slider is close to the edge of the screen,
  // the swipe gesture will be triggered instead of the slider
  // making the user go back to the previous screen. This is a
  // workaround to prevent that.
  const safePadding = Platform.OS === "android" ? theme.spacing[7] : 0;

  const sliderLength = (props?.sliderLength ?? 0) - safePadding * 2;

  const hasSecondMarker = (props.values?.length ?? 0) > 1;

  const stroke = 3;

  const safeBorderStyle = {
    height: stroke,
    width: safePadding,
    backgroundColor: theme.colors.border,
    zIndex: -1,
    borderTopRightRadius: theme.radii.md,
    borderBottomRightRadius: theme.radii.md
  };

  const CustomLabels = (label: LabelProps) => {
    const oneMarkerValue =
      Number(label.oneMarkerValue) >= (props.max ?? 0)
        ? "∞"
        : label.oneMarkerValue;

    const twoMarkerValue =
      Number(label.twoMarkerValue) >= (props.max ?? 0)
        ? "∞"
        : label.twoMarkerValue;

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

  const style = {
    flexDirection: "row",
    alignItems: "center"
  } as const;

  const trackStyle = {
    backgroundColor: theme.colors.border,
    height: stroke
  };
  const selectedStyle = {
    backgroundColor: theme.colors.primary
  };
  return (
    <View style={style}>
      <View
        style={[
          safeBorderStyle,
          {
            backgroundColor: hasSecondMarker
              ? theme.colors.border
              : theme.colors.primary
          }
        ]}
      />
      <MultiSlider
        enableLabel
        customLabel={CustomLabels}
        customMarker={CustomMarker}
        trackStyle={trackStyle}
        selectedStyle={selectedStyle}
        {...props}
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
  Label: CustomLabel
};
