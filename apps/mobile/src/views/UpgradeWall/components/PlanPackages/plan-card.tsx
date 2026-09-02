import type { PurchasesPackage } from "react-native-purchases";

import * as React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import { Text } from "@/components/text";
import { Checkbox } from "@/views/UpgradeWall/components/Checkbox";
import {
  PercentText,
  PlanContainer,
  Price,
  styles as planPackagesStyles,
} from "@/views/UpgradeWall/components/PlanPackages/styles";

const formatPrice = (value: number, currency: string) =>
  new Intl.NumberFormat("default", {
    style: "currency",
    currency,
  }).format(value);

const getPeriodDetails = (
  period: string,
): {
  periodUnit: "D" | "W" | "M" | "Y";
  periodValue: number;
} => {
  const [, num, unit] = period.match(/P(\d+)(D|W|M|Y)/) ?? [];

  if (!num || !unit) throw new Error("Invalid period format");

  return {
    periodUnit: unit as "D" | "W" | "M" | "Y",
    periodValue: Math.trunc(Number(num)),
  };
};

type PlanCardProps = {
  selected: boolean;
  onPress: () => void;
  planPackage: PurchasesPackage;
  /** Percent saved against paying monthly. Hidden when undefined. */
  savingPercent?: number;
};

export const PlanCard: React.FC<PlanCardProps> = ({
  selected,
  onPress,
  planPackage: pkg,
  savingPercent,
}) => {
  const { t } = useTranslation();
  const { product } = pkg;

  const {
    price: currentPrice,
    currencyCode,
    subscriptionPeriod: period,
    identifier,
  } = product;

  const formattedCurrentPrice = formatPrice(currentPrice, currencyCode);

  const { periodUnit, periodValue } = getPeriodDetails(period || "");

  const pricePerMonth = (() => {
    if (!periodUnit || !periodValue) return;
    switch (periodUnit) {
      case "D":
        return currentPrice / periodValue;
      case "W":
        return currentPrice / (periodValue * 4); // Approximation
      case "M":
        return currentPrice / periodValue;
      case "Y":
        return currentPrice / (periodValue * 12); // Approximation
      default:
        return 0;
    }
  })();

  // A single month already reads as "X/mo", so the total would just repeat it.
  const showTotalPrice = !(periodUnit === "M" && periodValue === 1);

  const translatedPlanName = (() => {
    switch (identifier) {
      case "premium_monthly":
        return t("plans.monthly");
      case "premium_yearly":
        return t("plans.yearly");
      default:
        return product.title;
    }
  })();
  planPackagesStyles.useVariants({ selected });

  return (
    <PlanContainer
      testID={`upgrade-wall-plan-${identifier}`}
      onPress={onPress}
      style={planPackagesStyles.planContainer}
      accessible
    >
      <Checkbox selected={selected} />
      <View style={planPackagesStyles.flex}>
        <Text fontSize="sm" fontWeight="semibold">
          {translatedPlanName}
        </Text>
        {pricePerMonth ? (
          <Price
            color="subtitle"
            fontSize="md"
            fontWeight="semibold"
            style={planPackagesStyles.price}
          >
            {`${formatPrice(pricePerMonth, currencyCode)}/${t("plans.M")}`}
            {showTotalPrice ? (
              <Text color="subtitle" fontSize="md">
                {` (${formattedCurrentPrice}/${t(`plans.${periodUnit}`)})`}
              </Text>
            ) : null}
          </Price>
        ) : null}
      </View>
      {savingPercent ? (
        <View style={planPackagesStyles.percentContainer}>
          <PercentText
            fontSize="sm"
            fontWeight="semibold"
            style={planPackagesStyles.percentText}
          >
            {t("plans.save", { percent: savingPercent })}
          </PercentText>
        </View>
      ) : null}
    </PlanContainer>
  );
};
