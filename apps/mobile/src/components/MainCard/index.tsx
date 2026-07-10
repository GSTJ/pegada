import type { SwipeDog } from "@/store/reducers/dogs/swipe";
import { useCallback, useRef, useState } from "react";
import * as React from "react";
import { View } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "styled-components/native";

import {
  createHeroNavigationWatchdog,
  setHeroTarget,
  startHero,
  useHeroState,
  useIsHeroActive,
} from "@/components/HeroTransition/store";
import { PressableArea } from "@/components/PressableArea";
import { getTrcpContext } from "@/contexts/trcpContext";
import { SceneName } from "@/types/SceneName";
import Distance from "./components/Distance";
import Pagination from "./components/Pagination";
import PersonalInfo from "./components/PersonalInfo";
import {
  CarouselContainer,
  Container,
  NextImage,
  PhotoAnchor,
  Picture,
  PreviousImage,
  UpperPart,
} from "./styles";

const springConfig = { mass: 0.2 };

const START_IMAGE_INDEX = 0;

export interface VisitingCardProps extends React.ComponentProps<typeof Container> {
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
  const theme = useTheme();

  const rotation = useSharedValue(0);

  // When rendered inside DogProfile (no personal info), this card is the hero
  // *destination*; on the swipe deck it's the *source*.
  const isHeroDestination = !shouldShowPersonalInfo;
  const photoAnchorRef = useRef<View>(null);
  const heroActive = useIsHeroActive(dog.id);
  const activeHero = useHeroState();
  const hideSharedChrome = heroActive && Boolean(activeHero.chrome);

  const currentPhoto = images[currentImage];

  const openUserProfile = () => {
    // The swipe response already contains the complete DogProfile payload.
    // Refresh the exact query key at the interaction boundary so an entry
    // that has aged out of React Query never suspends between the card and
    // the hero destination.
    getTrcpContext().dog.get.setData({ id: dog.id }, dog);

    const navigate = (heroTransition?: string) => {
      router.push({
        pathname: `${SceneName.Profile}/[id]`,
        params: {
          id: dog.id,
          currentImageIndex: currentImage,
          heroTransition,
        },
      });
    };
    const finishNavigation = createHeroNavigationWatchdog(navigate);

    // Kick off the manual hero morph: freeze the tapped photo into a flying
    // overlay measured at its on-screen frame, then navigate. The destination
    // card reports its frame on mount (see onDestinationLayout) and the
    // overlay animates between the two. See @/components/HeroTransition/store.
    photoAnchorRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0 && currentPhoto?.url) {
        finishNavigation(() => {
          startHero({
            id: dog.id,
            source: { uri: currentPhoto.url, blurhash: currentPhoto.blurhash },
            from: { x, y, width, height, borderRadius: theme.radii.lg },
            chrome: {
              dog,
              pages: images.length,
              currentPage: currentImage,
            },
          });
        });
        return;
      }
      finishNavigation();
    });
  };

  const onDestinationLayout = useCallback(() => {
    if (!isHeroDestination) return;
    // Defer to the next frame so native layout has settled before we measure.
    requestAnimationFrame(() => {
      photoAnchorRef.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          setHeroTarget({ id: dog.id, to: { x, y, width, height, borderRadius: 0 } });
        }
      });
    });
  }, [dog.id, isHeroDestination]);

  const gotoPreviousImage = () => {
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage !== 0) return setCurrentImage((index) => index - 1);

    // eslint-disable-next-line react-compiler/react-compiler -- false positive
    rotation.value = withSequence(withSpring(-0.5, springConfig), withSpring(0, springConfig));
  };

  const gotoNextImage = () => {
    // If there is only one image, open the user profile for now.
    // Not ideal to be here, but improves UX a little - just a quick fix
    if (images.length <= 1 && shouldShowPersonalInfo) return openUserProfile();

    if (currentImage + 1 < images.length) {
      return setCurrentImage((index) => index + 1);
    }
    rotation.value = withSequence(withSpring(0.5, springConfig), withSpring(0, springConfig));
  };

  const transform = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [{ perspective: 100 }, { rotateY: `${rotation.value}deg` }],
    };
  });

  return (
    <Container testID="swipe-card" {...props} style={[props.style, transform]}>
      <PhotoAnchor
        ref={photoAnchorRef}
        onLayout={onDestinationLayout}
        // While the hero overlay is flying, hide the real photo so only the
        // overlay copy is visible (no double image). The overlay clears itself
        // once the morph lands, revealing this again.
        style={heroActive ? { opacity: 0 } : undefined}
      >
        <Picture
          source={{
            uri: currentPhoto?.url,
            blurhash: currentPhoto?.blurhash,
          }}
          key={currentPhoto?.id}
        />
      </PhotoAnchor>
      <LinearGradient
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        colors={["rgba(0, 0, 0, .5)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]}
      />
      <UpperPart style={hideSharedChrome ? { opacity: 0 } : undefined}>
        <Distance dog={dog} />
        <Pagination pages={images.length} currentPage={currentImage} />
        <CarouselContainer>
          <PreviousImage onPress={gotoPreviousImage} />
          <NextImage onPress={gotoNextImage} />
        </CarouselContainer>
      </UpperPart>
      {Boolean(shouldShowPersonalInfo) && (
        <PressableArea testID="swipe-card-open-profile" onPress={openUserProfile}>
          <PersonalInfo dog={dog} />
        </PressableArea>
      )}
    </Container>
  );
};

export default VisitingCard;
