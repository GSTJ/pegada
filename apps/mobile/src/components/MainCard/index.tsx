import type { SwipeDog } from "@/store/reducers/dogs/swipe";

import { useState } from "react";
import * as React from "react";

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
import {
  CarouselContainer,
  Container,
  NextImage,
  Picture,
  PreviousImage,
  Scrim,
  UpperPart,
} from "./styles";

const springConfig = { mass: 0.2 };

const START_IMAGE_INDEX = 0;

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

  const rotation = useSharedValue(0);

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

    rotation.value = withSequence(
      withSpring(-0.5, springConfig),
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
    rotation.value = withSequence(
      withSpring(0.5, springConfig),
      withSpring(0, springConfig),
    );
  };

  const transform = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ perspective: 100 }, { rotateY: `${rotation.value}deg` }],
    };
  });

  return (
    <Container testID="swipe-card" {...props} style={[props.style, transform]}>
      <Picture
        source={{
          uri: images[currentImage]?.url,
          blurhash: images[currentImage]?.blurhash,
        }}
        key={images[currentImage]?.id}
      />
      <Scrim
        colors={[
          "rgba(0, 0, 0, .5)",
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, 0)",
        ]}
      />
      <UpperPart>
        <Distance dog={dog} />
        <Pagination pages={images.length} currentPage={currentImage} />
        <CarouselContainer>
          <PreviousImage onPress={gotoPreviousImage} />
          <NextImage onPress={gotoNextImage} />
        </CarouselContainer>
      </UpperPart>
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
