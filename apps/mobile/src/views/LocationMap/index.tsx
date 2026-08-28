import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, View } from "react-native";

import { useRouter } from "expo-router";

import { useHeaderHeight } from "@react-navigation/elements";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";
import { useDispatch } from "react-redux";

import { useBottomActionStyle } from "@/components/BottomAction";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { api } from "@/contexts/trpc-provider";
import { sendError } from "@/services/error-tracking";
import { Actions } from "@/store/reducers";

import { updateUserLocation } from "../(auth)/AskForLocation/update-user-location";
import { Marker } from "./components/Marker";
import { Submit } from "./components/Submit";
import { MapView, styles } from "./styles";

/**
 * How long the camera has to stay quiet before the screen is treated as
 * settled. Long enough not to fight a fling, short enough that nobody is left
 * looking at a screen with no primary action.
 */
const SETTLE_AFTER_QUIET_MS = 700;

const LocationMap = () => {
  const mapRef = useRef(null);
  const { t } = useTranslation();
  const router = useRouter();

  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false,
  });

  const user = dog?.user;

  if (!user) {
    throw new Error("User not found");
  }

  const [location, setLocation] = useState({
    latitude: user.latitude ?? 0,
    longitude: user.longitude ?? 0,
  });

  const dispatch = useDispatch();

  const userMutation = useMutation({
    mutationFn: async () => {
      if (!location.latitude || !location.longitude) return;
      await updateUserLocation(location);
      dispatch(Actions.dogs.list.refetch());
    },
    onSuccess: () => {
      magicToast.success("Localização atualizada com sucesso!", 1000);
      router.back();
    },
    onError: (error) => {
      Alert.alert(t("common.oops"), t("locationMap.updateLocationError"));
      sendError(error);
    },
  });

  // onRegionChange fires on first render
  // This is a workaround to prevent that
  const [touchStarted, setTouchStarted] = useState(false);
  const dragging = useSharedValue(0);

  // Mirrors `dragging` for the things that are mounted/unmounted rather than
  // animated — the "Are you here?" callout. It used to key off `touchStarted`,
  // which is a latch, so the callout disappeared on the first pan for good.
  const [isDragging, setIsDragging] = useState(false);

  const settleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSettleTimeout = () => {
    if (!settleTimeout.current) return;
    clearTimeout(settleTimeout.current);
    settleTimeout.current = null;
  };

  /** Back to rest: pin tinted, callout up, Confirm Location reachable. */
  const settle = useCallback(() => {
    clearSettleTimeout();
    setIsDragging(false);
    dragging.value = withTiming(0, {
      easing: Easing.out(Easing.ease),
      duration: 350,
    });
  }, [dragging]);

  const beginDrag = useCallback(() => {
    setIsDragging(true);
    dragging.value = withTiming(1, {
      easing: Easing.in(Easing.ease),
      duration: 200,
    });

    // Settling used to depend entirely on `onRegionChangeComplete`, which
    // Android emits from GoogleMap's `onCameraIdle`. When that did not arrive,
    // `dragging` stayed at 1 forever: the Confirm button faded to nothing, the
    // callout was gone and the pin kept its dark drag colour — ten seconds
    // after the finger came off, and for the rest of the screen's life. A
    // quiet period is not a race with the real event; whichever lands first
    // wins and the other is a no-op.
    clearSettleTimeout();
    settleTimeout.current = setTimeout(settle, SETTLE_AFTER_QUIET_MS);
  }, [dragging, settle]);

  useEffect(() => clearSettleTimeout, []);

  const { height: buttomActionHeight } = useBottomActionStyle();
  const headerHeight = useHeaderHeight();

  const legalLabelInsets = {
    bottom: 15 + buttomActionHeight,
    top: 15 + headerHeight,
    right: 10,
    left: 10,
  };

  // For some reason Apple Maps has a different padding and already starts offseted
  const verticalMapPadding = Platform.OS === "ios" ? -16 : 4;

  const mapPadding = {
    bottom: buttomActionHeight + verticalMapPadding,
    top: buttomActionHeight + verticalMapPadding,
    right: 10,
    left: 10,
  };

  const { theme } = useUnistyles();

  return (
    <View style={styles.container} testID="location-map-screen">
      <MapView
        ref={mapRef}
        showsUserLocation
        legalLabelInsets={legalLabelInsets}
        mapPadding={mapPadding}
        // Android doesn't switch maps to dark mode like IOS does,
        // so we need to set the custom style manually
        customMapStyle={
          theme.dark ? require("./assets/map-dark.json") : undefined
        }
        key={theme.dark ? "dark" : "light"}
        initialRegion={{
          latitude: location?.latitude,
          longitude: location?.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onTouchStart={() => setTouchStarted(true)}
        onRegionChange={() => {
          if (!touchStarted) return;
          beginDrag();
        }}
        onRegionChangeComplete={(newLocation: {
          latitude: number;
          longitude: number;
        }) => {
          setLocation({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
          });

          settle();
        }}
      />
      <Marker isDragging={isDragging} dragging={dragging} />
      <Submit
        loading={userMutation.isPending}
        onPress={() => userMutation.mutate()}
        dragging={dragging}
      />
    </View>
  );
};

const LocationMapScreen = () => (
  <NetworkBoundary>
    <LocationMap />
  </NetworkBoundary>
);

export default LocationMapScreen;
