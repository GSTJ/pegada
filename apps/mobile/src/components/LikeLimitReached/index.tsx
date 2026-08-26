import type { LikeLimitReachedProps } from "@/components/LikeLimitReached/use-countdown";

import { useEffect } from "react";
import * as React from "react";
import { View } from "react-native";

import { useRouter } from "expo-router";

import { FREE_DAILY_SWIPE_LIMIT } from "@pegada/shared/constants/constants";
import { Trans, useTranslation } from "react-i18next";
import { magicModal, useMagicModal } from "react-native-magic-modal";

import { Description, OkButton, Title } from "@/components/DefaultModal/styles";
import {
  Container,
  styles as likeLimitReachedStyles,
} from "@/components/LikeLimitReached/styles";
import {
  useCountdown,
  ZERO_TIME_LEFT,
} from "@/components/LikeLimitReached/use-countdown";
import { CloseIcon, styles as pickerStyles } from "@/components/Picker/styles";
import { Text } from "@/components/text";
import { useEligibleForTrial } from "@/hooks/use-payments";
import { analytics } from "@/services/analytics";
import { SceneName } from "@/types/scene-name";

import { PinnedCloseButton } from "./styles";

const LikeLimitReached: React.FC<LikeLimitReachedProps> = ({
  likeLimitResetAt,
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
    <Container style={likeLimitReachedStyles.container}>
      <View style={likeLimitReachedStyles.header}>
        <Title>{t("likeLimit.dailyLikeLimit")}</Title>
        <Description>
          <Trans
            i18nKey="likeLimit.description"
            components={{
              b: <Text key="b" fontWeight="semibold" />,
            }}
            values={{ count: FREE_DAILY_SWIPE_LIMIT }}
          />
        </Description>
      </View>
      <View style={likeLimitReachedStyles.countdownContainer}>
        <Text fontSize="xxl" fontWeight="bold">
          {t("likeLimit.timeHours", { time: timeLeft })}
        </Text>
        <Text>{t("likeLimit.remaining")}</Text>
      </View>
      <OkButton
        onPress={() => {
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
      <PinnedCloseButton
        onPress={() => hide()}
        style={likeLimitReachedStyles.pinnedCloseButton}
      >
        <CloseIcon width={10} height={10} style={pickerStyles.closeIcon} />
      </PinnedCloseButton>
    </Container>
  );
};

export const showLikeLimitReached = (props: LikeLimitReachedProps) => {
  analytics.track({
    event_type: "Like Limit Reached",
    event_properties: {
      likeLimit: FREE_DAILY_SWIPE_LIMIT,
      likeLimitResetAt: props.likeLimitResetAt,
    },
  });
  return magicModal.show(() => <LikeLimitReached {...props} />);
};
