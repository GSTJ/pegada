import type { MapViewProps } from "react-native-maps";

import { forwardRef } from "react";

import RNMap from "react-native-maps";
import { StyleSheet, withUnistyles } from "react-native-unistyles";

const Map = withUnistyles(RNMap);

/**
 * The four props below are the former `.attrs()`, and they sit *after* the
 * spread on purpose: a static `.attrs()` object beat whatever the caller
 * passed, and `index.tsx` passes `showsUserLocation` itself. Moving them in
 * front would quietly hand that decision to the call site.
 */
export const MapView = forwardRef<RNMap, MapViewProps>(
  ({ style, ...props }, ref) => (
    <Map
      {...props}
      ref={ref}
      showsUserLocation
      rotateEnabled={false}
      showsCompass={false}
      pitchEnabled={false}
      style={[styles.mapView, style]}
    />
  ),
);

MapView.displayName = "MapView";

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  mapView: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
});
