import type { PaywallTrigger } from "@pegada/shared/analytics/events";
import type { PurchasesPackage } from "react-native-purchases";

import { useEffect, useState } from "react";
import * as React from "react";
import { Alert, Platform, ScrollView, View } from "react-native";

import { isDevice } from "expo-device";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { useEligibleForTrial } from "@/hooks/use-payments";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { haptics } from "@/services/haptics";
import { payments } from "@/services/payments";
import Benefits from "@/views/UpgradeWall/components/Benefits";
import PlanPackages from "@/views/UpgradeWall/components/PlanPackages";
import RestorePurchases from "@/views/UpgradeWall/components/RestorePurchases";

import {
  CloseButton,
  CloseIcon,
  GradientEffect,
  Header,
  HeroImage,
  styles,
  Subtitle,
  Title,
} from "./styles";

const useTranslatedTrialDuration = (
  offering: PurchasesPackage | null | undefined,
) => {
  const { t } = useTranslation();

  const introPrice = offering?.product.introPrice;
  if (!introPrice) return;

  const quantity = introPrice.periodNumberOfUnits;

  const props = { replace: { unit: quantity } };

  switch (introPrice.periodUnit) {
    case "DAY":
      return quantity === 1
        ? t("dateFormatting.day", props)
        : t("dateFormatting.days", props);
    case "WEEK":
      return quantity === 1
        ? t("dateFormatting.week", props)
        : t("dateFormatting.weeks", props);
    case "MONTH":
      return quantity === 1
        ? t("dateFormatting.month", props)
        : t("dateFormatting.months", props);
    case "YEAR":
      return quantity === 1
        ? t("dateFormatting.year", props)
        : t("dateFormatting.years", props);
  }
};

const isPaywallTrigger = (value: unknown): value is PaywallTrigger =>
  value === "like_limit" ||
  value === "profile_plan" ||
  value === "swipe_back" ||
  value === "other";

const UpgradeWall: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const router = useRouter();
  const { t } = useTranslation();

  // Every caller passes its own reason (see the three `router.push` sites), so
  // conversion can be read per entry point rather than as one blended number.
  // "other" covers a route opened by anything that forgot to say.
  const { trigger } = useLocalSearchParams();
  const paywallTrigger: PaywallTrigger = isPaywallTrigger(trigger)
    ? trigger
    : "other";

  useEffect(() => {
    analytics.track({
      event_type: "Paywall Viewed",
      event_properties: { trigger: paywallTrigger },
    });
  }, [paywallTrigger]);

  const [selectedOffering, setSelectedOffering] = useState<
    PurchasesPackage | null | undefined
  >();

  const freeTrialDuration = useTranslatedTrialDuration(selectedOffering);

  const purchasePackage = useMutation({
    mutationFn: payments.purchasePackage,
    onMutate: () => {
      analytics.track({
        event_type: "Upgrade",
        event_properties: {
          package: selectedOffering?.product.identifier,
          trial: isEligibleForTrial,
          type: "start",
        },
      });
    },
    onSuccess: () => {
      haptics.success();

      analytics.track({
        event_type: "Upgrade",
        event_properties: {
          package: selectedOffering?.product.identifier,
          trial: isEligibleForTrial,
          type: "success",
        },
      });
      router.back();
    },
    onError: (e) => {
      if (e instanceof Object && "userCancelled" in e && e.userCancelled) {
        return analytics.track({
          event_type: "Upgrade",
          event_properties: {
            package: selectedOffering?.product.identifier,
            trial: isEligibleForTrial,
            type: "cancel",
          },
        });
      }

      sendError(e);

      // If it's a simulator, an error is expected
      if (!isDevice) return;

      haptics.error();

      analytics.track({
        event_type: "Upgrade",
        event_properties: {
          package: selectedOffering?.product.identifier,
          trial: isEligibleForTrial,
          type: "error",
        },
      });

      Alert.alert(t("common.somethingWrong"), t("common.tryAgainLater"));
    },
  });

  const bottomActionStyle = useBottomActionStyle();

  const isEligibleForTrial = useEligibleForTrial({
    offering: selectedOffering,
  });

  const title = t(
    isEligibleForTrial
      ? "plans.upgradeWall.earnedFreeTrial"
      : "plans.upgradeWall.getPremium",
  );

  const trialSubtitle = isEligibleForTrial
    ? t("plans.upgradeWall.tryPremiumFree", { duration: freeTrialDuration })
    : t("plans.upgradeWall.enjoyFullAccess");

  const buttonText = t(
    isEligibleForTrial
      ? "plans.upgradeWall.startFreeTrial"
      : "plans.upgradeWall.getPremium",
  );

  const paddingTop =
    Platform.OS === "ios" ? theme.spacing[2] : insets.top + theme.spacing[2];
  const headerHeight = 40 + paddingTop;

  return (
    <View testID="upgrade-wall-screen" style={styles.container}>
      <ScrollView
        style={styles.content}
        {...bottomActionStyle.scrollViewProps}
        contentContainerStyle={{
          ...bottomActionStyle.scrollViewProps.contentContainerStyle,
          gap: theme.spacing[5],
          paddingBottom:
            bottomActionStyle.scrollViewProps.contentContainerStyle
              .paddingBottom + theme.spacing[8],
          paddingTop: theme.spacing[3] + headerHeight,
        }}
      >
        <HeroImage
          style={styles.heroImage}
          source={
            theme.dark
              ? require("@/views/UpgradeWall/assets/background-dark.webp")
              : require("@/views/UpgradeWall/assets/background-light.webp")
          }
        />
        <View style={{ gap: theme.spacing[7] }}>
          <View>
            <Title style={styles.title} fontSize="xl" fontWeight="bold">
              {title}
            </Title>
            <Subtitle style={styles.subtitle} fontWeight="semibold">
              {trialSubtitle}
            </Subtitle>
          </View>

          <PlanPackages
            selectedPackage={selectedOffering}
            setSelectedPackage={setSelectedOffering}
          />
        </View>

        <Benefits />
      </ScrollView>

      <Header
        intensity={100}
        style={[
          styles.header,
          {
            height: headerHeight,
            paddingTop,
          },
        ]}
      >
        <RestorePurchases />
        <CloseButton
          testID="upgrade-wall-close"
          // Generous hitSlop — the visible target is 32x32 (theme.spacing[8])
          // which is below Apple's 44pt minimum; Maestro's tap-by-id resolves
          // to the *center* of the view, but human taps (and validator
          // coord-based fallbacks) frequently miss when the target sits
          // flush against the screen corner. Expanding the touch area to
          // ~64x64 covers safe-area + finger drift without changing layout.
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          onPress={() => {
            router.back();
          }}
        >
          <CloseIcon />
        </CloseButton>
      </Header>

      <GradientEffect style={styles.gradientEffect} />

      <BottomAction.Container>
        <Button
          testID="upgrade-wall-purchase-cta"
          onPress={() => {
            if (selectedOffering) purchasePackage.mutate(selectedOffering);
          }}
          disabled={!selectedOffering}
          loading={purchasePackage.isPending || !selectedOffering}
        >
          {buttonText}
        </Button>
      </BottomAction.Container>
    </View>
  );
};

export default UpgradeWall;
