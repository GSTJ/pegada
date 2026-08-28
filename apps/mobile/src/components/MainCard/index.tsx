import type { SwipeDog } from "@/store/reducers/dogs/swipe";

import { useState } from "react";
import * as React from "react";
import { Pressable, View } from "react-native";

import { useRouter } from "expo-router";

import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { PressableArea } from "@/components/pressable-area";
import { SceneName } from "@/types/scene-name";

import Distance from "./components/Distance";
import Pagination from "./components/Pagination";
import PersonalInfo from "./components/PersonalInfo";
import { Container, Picture, Scrim, styles } from "./styles";

const springConfig = { mass: 0.2 };

const START_IMAGE_INDEX = 0;

/**
 * How far the card slides when there is no photo that way, in dp.
 *
 * This used to be a `rotateY` of half a degree under a `perspective` of 100,
 * and it rendered as a black rectangle over half the card. A non-affine
 * transform on a layer that also has `overflow: hidden` forces Core Animation
 * to composite it offscreen, and on iOS 26 one half of the card came back
 * empty for the ~330ms the spring ran — the DogProfile's black backdrop
 * showing through, photo, pagination dots and distance pill all gone.
 * Measured across 40 screenshots taken during the gesture: 6 of them had
 * 49.7% of the card as pure #000000, split by a dead-straight vertical seam
 * down the middle.
 *
 * The seam is the tell. The half that DID draw was not rotated at all — no
 * keystone, no skew — so the 3D warp was never visible in the first place.
 * Half a degree of rotateY on a 393dp card is a sub-pixel effect; all it ever
 * did was buy the compositing bug. A translate is affine, needs no offscreen
 * pass, and is the rubber-band every list on the platform uses to say "this is
 * the end".
 */
const EDGE_NUDGE = 10;

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

  const nudge = useSharedValue(0);

  const openUserProfile = () => {
    router.push({
      pathname: `${SceneName.Profile}/[id]`,
      params: {
        id: dog.id,
        currentImageIndex: currentImage,
      },
    });
  };

  const gotoPreviousImage = () => {
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage !== 0) return setCurrentImage((index) => index - 1);

    // Already on the first photo: slide right, towards the edge the reader is
    // trying to reach.
    nudge.value = withSequence(
      withSpring(EDGE_NUDGE, springConfig),
      withSpring(0, springConfig),
    );
  };

  const gotoNextImage = () => {
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage + 1 < images.length) {
      return setCurrentImage((index) => index + 1);
    }
    // Already on the last photo.
    nudge.value = withSequence(
      withSpring(-EDGE_NUDGE, springConfig),
      withSpring(0, springConfig),
    );
  };

  const transform = useAnimatedStyle(() => {
    "worklet";
    return { transform: [{ translateX: nudge.value }] };
  });

  return (
    <Container testID="swipe-card" {...props} style={[props.style, transform]}>
      <Picture
        source={{
          uri: images[currentImage]?.url,
          blurhash: images[currentImage]?.blurhash ?? undefined,
        }}
        key={images[currentImage]?.id}
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
