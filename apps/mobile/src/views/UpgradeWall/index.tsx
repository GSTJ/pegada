import { useState } from "react";
import * as React from "react";
import { Alert, Platform, View } from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isDevice } from "expo-device";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { useEligibleForTrial } from "@/hooks/usePayments";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { payments } from "@/services/payments";
import Benefits from "@/views/UpgradeWall/components/Benefits";
import PlanPackages from "@/views/UpgradeWall/components/PlanPackages";
import RestorePurchases from "@/views/UpgradeWall/components/RestorePurchases";
import {
  CloseButton,
  CloseIcon,
  Container,
  Content,
  GradientEffect,
  Header,
  HeroImage,
  Subtitle,
  Title
} from "./styles";

const useTranslatedTrialDuration = (
  offering: PurchasesPackage | null | undefined
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

const UpgradeWall: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

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
          type: "start"
        }
      });
    },
    onSuccess: () => {
      analytics.track({
        event_type: "Upgrade",
        event_properties: {
          package: selectedOffering?.product.identifier,
          trial: isEligibleForTrial,
          type: "success"
        }
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
            type: "cancel"
          }
        });
      }

      sendError(e);

      // If it's a simulator, an error is expected
      if (!isDevice) return;

      analytics.track({
        event_type: "Upgrade",
        event_properties: {
          package: selectedOffering?.product.identifier,
          trial: isEligibleForTrial,
          type: "error"
        }
      });

      Alert.alert(t("common.somethingWrong"), t("common.tryAgainLater"));
    }
  });

  const bottomActionStyle = useBottomActionStyle();

  const isEligibleForTrial = useEligibleForTrial({
    offering: selectedOffering
  });

  const title = t(
    isEligibleForTrial
      ? "plans.upgradeWall.earnedFreeTrial"
      : "plans.upgradeWall.getPremium"
  );

  const trialSubtitle = isEligibleForTrial
    ? t("plans.upgradeWall.tryPremiumFree", { duration: freeTrialDuration })
    : t("plans.upgradeWall.enjoyFullAccess");

  const buttonText = t(
    isEligibleForTrial
      ? "plans.upgradeWall.startFreeTrial"
      : "plans.upgradeWall.getPremium"
  );

  const paddingTop =
    Platform.OS === "ios" ? theme.spacing[2] : insets.top + theme.spacing[2];
  const headerHeight = 40 + paddingTop;

  return (
    <Container>
      <Content
        {...bottomActionStyle.scrollViewProps}
        contentContainerStyle={{
          ...bottomActionStyle.scrollViewProps.contentContainerStyle,
          gap: theme.spacing[5],
          paddingBottom:
            bottomActionStyle.scrollViewProps.contentContainerStyle
              .paddingBottom + theme.spacing[8],
          paddingTop: theme.spacing[3] + headerHeight
        }}
      >
        <HeroImage
          source={
            theme.dark
              ? require("@/views/UpgradeWall/assets/background-dark.webp")
              : require("@/views/UpgradeWall/assets/background-light.webp")
          }
        />
        <View style={{ gap: theme.spacing[7] }}>
          <View>
            <Title fontSize="xl" fontWeight="bold">
              {title}
            </Title>
            <Subtitle fontWeight="semibold">{trialSubtitle}</Subtitle>
          </View>

          <PlanPackages
            selectedPackage={selectedOffering}
            setSelectedPackage={setSelectedOffering}
          />
        </View>

        <Benefits />
      </Content>

      <Header
        intensity={100}
        style={{
          height: headerHeight,
          paddingTop
        }}
      >
        <RestorePurchases />
        <CloseButton
          onPress={() => {
            router.back();
          }}
        >
          <CloseIcon />
        </CloseButton>
      </Header>

      <GradientEffect />

      <BottomAction.Container>
        <Button
          onPress={() => {
            purchasePackage.mutate(selectedOffering!);
          }}
          disabled={!selectedOffering}
          loading={purchasePackage.isPending || !selectedOffering}
        >
          {buttonText}
        </Button>
      </BottomAction.Container>
    </Container>
  );
};

export default UpgradeWall;
