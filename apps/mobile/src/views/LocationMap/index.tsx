import { useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import { magicToast } from "react-native-magic-toast";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useTheme } from "styled-components/native";

import { useBottomActionStyle } from "@/components/BottomAction";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { api } from "@/contexts/TRPCProvider";
import { sendError } from "@/services/errorTracking";
import { Actions } from "@/store/reducers";
import { updateUserLocation } from "../(auth)/AskForLocation";
import { Marker } from "./components/Marker";
import { Submit } from "./components/Submit";
import { Container, MapView } from "./styles";

const LocationMap = () => {
  const mapRef = useRef(null);
  const { t } = useTranslation();
  const router = useRouter();

  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false
  });

  const user = dog?.user;

  if (!user) {
    throw new Error("User not found");
  }

  const [location, setLocation] = useState({
    latitude: user.latitude ?? 0,
    longitude: user.longitude ?? 0
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
    }
  });

  // onRegionChange fires on first render
  // This is a workaround to prevent that
  const [touchStarted, setTouchStarted] = useState(false);
  const dragging = useSharedValue(0);

  const { height: buttomActionHeight } = useBottomActionStyle();
  const headerHeight = useHeaderHeight();

  const legalLabelInsets = {
    bottom: 15 + buttomActionHeight,
    top: 15 + headerHeight,
    right: 10,
    left: 10
  };

  // For some reason Apple Maps has a different padding and already starts offseted
  const verticalMapPadding = Platform.OS === "ios" ? -16 : 4;

  const mapPadding = {
    bottom: buttomActionHeight + verticalMapPadding,
    top: buttomActionHeight + verticalMapPadding,
    right: 10,
    left: 10
  };

  const theme = useTheme();

  return (
    <Container>
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
          longitudeDelta: 0.005
        }}
        onTouchStart={() => setTouchStarted(true)}
        onRegionChange={() => {
          if (!touchStarted) return;
          // eslint-disable-next-line react-compiler/react-compiler -- false positive
          dragging.value = withTiming(1, {
            easing: Easing.in(Easing.ease),
            duration: 200
          });
        }}
        onRegionChangeComplete={(newLocation: {
          latitude: number;
          longitude: number;
        }) => {
          setLocation({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude
          });

          dragging.value = withTiming(0, {
            easing: Easing.out(Easing.ease),
            duration: 350
          });
        }}
      />
      <Marker touchStarted={touchStarted} dragging={dragging} />
      <Submit
        loading={userMutation.isPending}
        onPress={() => userMutation.mutate()}
        dragging={dragging}
      />
    </Container>
  );
};

export default () => (
  <NetworkBoundary>
    <LocationMap />
  </NetworkBoundary>
);
