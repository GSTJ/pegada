import { SlideInRight, SlideOutRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "styled-components/native";

import SwipeBackArrow from "@/assets/images/SwipeBackArrow.svg";
import { useUnsafeIsPremium } from "@/hooks/usePayments";
import { analytics } from "@/services/analytics";
import { Actions } from "@/store/reducers";
import { getLastCardId } from "@/store/selectors";
import { SceneName } from "@/types/SceneName";
import { Container, GoBack } from "./styles";

const SwipeBackButton = () => {
  const dispatch = useDispatch();
  const lastCardId = useSelector(getLastCardId);
  const theme = useTheme();

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
    <Container exiting={SlideOutRight} entering={SlideInRight}>
      <GoBack disabled={!canGoBack} onPress={handleGoBack}>
        <SwipeBackArrow width={21} height={15} fill={theme.colors.primary} />
      </GoBack>
    </Container>
  );
};

export default SwipeBackButton;
