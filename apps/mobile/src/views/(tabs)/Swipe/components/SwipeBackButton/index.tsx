import { useRouter } from "expo-router";

import Animated, { SlideInRight, SlideOutRight } from "react-native-reanimated";
import { useUnistyles } from "react-native-unistyles";
import { useDispatch, useSelector } from "react-redux";

import SwipeBackArrow from "@/assets/images/SwipeBackArrow.svg";
import { useUnsafeIsPremium } from "@/hooks/use-payments";
import { analytics } from "@/services/analytics";
import { Actions } from "@/store/reducers";
import { getLastCardId } from "@/store/selectors";
import { SceneName } from "@/types/scene-name";

import { GoBack, styles } from "./styles";

const SwipeBackButton = () => {
  const dispatch = useDispatch();
  const lastCardId = useSelector(getLastCardId);
  const { theme } = useUnistyles();

  const isPremium = useUnsafeIsPremium();
  const router = useRouter();

  const canGoBack = Boolean(lastCardId);

  if (!canGoBack) return null;

  const handleGoBack = () => {
    analytics.track({ event_type: "Swipe Back" });

    // Free users can't swipe back
    if (!isPremium) {
      return router.push(SceneName.UpgradeWall);
    }

    return dispatch(Actions.dogs.swipe.swipeBack());
  };

  return (
    <Animated.View
      exiting={SlideOutRight}
      entering={SlideInRight}
      style={styles.container}
    >
      <GoBack
        disabled={!canGoBack}
        onPress={handleGoBack}
        style={styles.goBack}
      >
        <SwipeBackArrow width={21} height={15} fill={theme.colors.primary} />
      </GoBack>
    </Animated.View>
  );
};

export default SwipeBackButton;
