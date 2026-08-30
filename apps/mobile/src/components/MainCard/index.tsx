import type { SwipeDog } from "@/store/reducers/dogs/swipe";

import { useState } from "react";
import * as React from "react";
import { Pressable, View } from "react-native";

import { useRouter } from "expo-router";

import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { PressableArea } from "@/components/pressable-area";
import { getTrcpContext } from "@/contexts/trcp-context";
import { haptics } from "@/services/haptics";
import { SceneName } from "@/types/scene-name";

import Distance from "./components/Distance";
import Pagination from "./components/Pagination";
import PersonalInfo from "./components/PersonalInfo";
import { Container, Picture, Scrim, styles } from "./styles";

const EDGE_TILT = 0.8;
const EDGE_SPRING = { duration: 240, dampingRatio: 0.9 } as const;

const START_IMAGE_INDEX = 0;

// oxlint-disable-next-line typescript/consistent-type-definitions -- `Container` is a reanimated Animated.View, whose props carry a string index signature. `interface … extends` keeps the members below at their declared types; the `{…} & Props` intersection the rule wants intersects each of them with the index signature's `any` and silently widens all three to `any`.
export interface VisitingCardProps extends React.ComponentProps<
  typeof Container
> {
  dog: SwipeDog;
  shouldShowPersonalInfo?: boolean;
  startImageIndex?: number;
}

const VisitingCard: React.FC<VisitingCardProps> = ({
  dog,
  shouldShowPersonalInfo = true,
  startImageIndex = START_IMAGE_INDEX,
  ...props
}) => {
  const { images = [] } = dog;
  const [currentImage, setCurrentImage] = useState(startImageIndex);
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const tilt = useSharedValue(0);

  const currentPhoto = images[currentImage];

  const openUserProfile = () => {
    // Keep the pushed screen warm so the native transition never lands on a
    // loading fallback between the card and its profile.
    getTrcpContext().dog.get.setData({ id: dog.id }, dog);
    router.push({
      pathname: `${SceneName.Profile}/[id]`,
      params: {
        id: dog.id,
        currentImageIndex: currentImage,
      },
    });
  };

  const showPhotoEdge = (degrees: number) => {
    haptics.selection();
    if (reduceMotion) return;
    tilt.value = withSequence(
      withSpring(degrees, EDGE_SPRING),
      withSpring(0, EDGE_SPRING),
    );
  };

  const gotoPreviousImage = () => {
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage !== 0) return setCurrentImage((index) => index - 1);

    showPhotoEdge(-EDGE_TILT);
  };

  const gotoNextImage = () => {
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage + 1 < images.length) {
      return setCurrentImage((index) => index + 1);
    }
    showPhotoEdge(EDGE_TILT);
  };

  const transform = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ rotateZ: `${tilt.value}deg` }] };
  });

  return (
    <Container testID="swipe-card" {...props} style={[props.style, transform]}>
      <Picture
        source={{
          uri: currentPhoto?.url,
          blurhash: currentPhoto?.blurhash ?? undefined,
        }}
        key={currentPhoto?.id}
      />
      <Scrim
        style={styles.scrim}
        colors={[
          "rgba(0, 0, 0, .5)",
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, 0)",
        ]}
      />
      <View style={styles.upperPart}>
        <Distance dog={dog} />
        <Pagination pages={images.length} currentPage={currentImage} />
        <View style={styles.carouselContainer}>
          <Pressable style={styles.previousImage} onPress={gotoPreviousImage} />
          <Pressable style={styles.nextImage} onPress={gotoNextImage} />
        </View>
      </View>
      {Boolean(shouldShowPersonalInfo) && (
        <PressableArea
          testID="swipe-card-open-profile"
          onPress={openUserProfile}
        >
          <PersonalInfo dog={dog} />
        </PressableArea>
      )}
    </Container>
  );
};

export default VisitingCard;
