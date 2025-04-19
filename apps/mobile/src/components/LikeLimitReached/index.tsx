import { useEffect } from "react";
import * as React from "react";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { useRouter } from "expo-router";
import { Trans, useTranslation } from "react-i18next";

import { FREE_DAILY_SWIPE_LIMIT } from "@pegada/shared/constants/constants";

import { Description, OkButton, Title } from "@/components/DefaultModal/styles";
import {
  Container,
  CountdownContainer,
  Header
} from "@/components/LikeLimitReached/styles";
import {
  LikeLimitReachedProps,
  useCountdown,
  ZERO_TIME_LEFT
} from "@/components/LikeLimitReached/useCountdown";
import { CloseIcon } from "@/components/Picker/styles";
import { Text } from "@/components/Text";
import { useEligibleForTrial } from "@/hooks/usePayments";
import { analytics } from "@/services/analytics";
import { SceneName } from "@/types/SceneName";
import { CloseButton } from "@/views/UpgradeWall/styles";

const LikeLimitReached: React.FC<LikeLimitReachedProps> = ({
  likeLimitResetAt
}) => {
  const timeLeft = useCountdown(likeLimitResetAt);
  const { t } = useTranslation();
  const router = useRouter();
  const { hide } = useMagicModal();

  const isEligibleForTrial = useEligibleForTrial();

  useEffect(() => {
    // Hide the modal when the time is up
    if (timeLeft === ZERO_TIME_LEFT) {
      hide();
    }
  }, [hide, timeLeft]);

  return (
    <Container>
      <Header>
        <Title>{t("likeLimit.dailyLikeLimit")}</Title>
        <Description>
          <Trans
            i18nKey="likeLimit.description"
            components={{
              b: <Text fontWeight="semibold" />
            }}
            values={{ count: FREE_DAILY_SWIPE_LIMIT }}
          />
        </Description>
      </Header>
      <CountdownContainer>
        <Text fontSize="xxl" fontWeight="bold">
          {t("likeLimit.timeHours", { time: timeLeft })}
        </Text>
        <Text>{t("likeLimit.remaining")}</Text>
      </CountdownContainer>
      <OkButton
        onPress={async () => {
          hide();

          // Need to wait a bit to avoid the modal transition
          setTimeout(() => {
            router.push(SceneName.UpgradeWall);
          }, 150);
        }}
      >
        {isEligibleForTrial
          ? t("likeLimit.winFreeTrial")
          : t("likeLimit.getPremium")}
      </OkButton>
      <CloseButton
        style={{ position: "absolute", top: 10, right: 10 }}
        onPress={() => hide()}
      >
        <CloseIcon width={10} height={10} />
      </CloseButton>
    </Container>
  );
};

export const showLikeLimitReached = (props: LikeLimitReachedProps) => {
  analytics.track({
    event_type: "Like Limit Reached",
    event_properties: {
      likeLimit: FREE_DAILY_SWIPE_LIMIT,
      likeLimitResetAt: props.likeLimitResetAt
    }
  });
  return magicModal.show(() => <LikeLimitReached {...props} />);
};
