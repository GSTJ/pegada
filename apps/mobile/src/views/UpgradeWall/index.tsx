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
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { haptics } from "@/services/haptics";
import { payments } from "@/services/payments";
import Benefits from "@/views/UpgradeWall/components/Benefits";
import PlanPackages from "@/views/UpgradeWall/components/PlanPackages";
import RestorePurchases from "@/views/UpgradeWall/components/RestorePurchases";

import {
  CancelAnytime,
  CloseButton,
  CloseIcon,
  GradientEffect,
  Header,
  HeroImage,
  styles,
  Subtitle,
  Title,
} from "./styles";

/**
 * The store price of the selected plan, spelled out with its billing period so
 * the amount next to the CTA is the amount that will actually be charged.
 * Uses RevenueCat's `priceString`, which is already formatted and localised by
 * the store, rather than reformatting the raw number ourselves.
 */
const usePriceLine = (offering: PurchasesPackage | null | undefined) => {
  const { t } = useTranslation();

  if (!offering) return;

  const price = offering.product.priceString;

  switch (offering.packageType) {
    case "ANNUAL":
      return t("plans.upgradeWall.priceYearly", { price });
    case "MONTHLY":
      return t("plans.upgradeWall.priceMonthly", { price });
    case "WEEKLY":
      return t("plans.upgradeWall.priceWeekly", { price });
    default:
      return t("plans.upgradeWall.price", { price });
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

  const priceLine = usePriceLine(selectedOffering);

  const purchasePackage = useMutation({
    mutationFn: payments.purchasePackage,
    onMutate: () => {
      analytics.track({
        event_type: "Upgrade",
        event_properties: {
          package: selectedOffering?.product.identifier,
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
          type: "error",
        },
      });

      Alert.alert(t("common.somethingWrong"), t("common.tryAgainLater"));
    },
  });

  const bottomActionStyle = useBottomActionStyle();

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
              {t("plans.upgradeWall.getPremium")}
            </Title>
            <Subtitle style={styles.subtitle} fontWeight="semibold">
              {t("plans.upgradeWall.enjoyFullAccess")}
            </Subtitle>
          </View>

          <View style={{ gap: theme.spacing[3] }}>
            <PlanPackages
              selectedPackage={selectedOffering}
              setSelectedPackage={setSelectedOffering}
            />
            {priceLine ? (
              <CancelAnytime
                style={styles.cancelAnytime}
                color="subtitle"
                fontSize="sm"
              >
                {priceLine}
              </CancelAnytime>
            ) : null}
          </View>
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
          {t("plans.upgradeWall.subscribe")}
        </Button>
      </BottomAction.Container>
    </View>
  );
};

export default UpgradeWall;
