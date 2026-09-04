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

  // Both amounts come from the store's own formatter (`priceString` and
  // `pricePerMonthString`), the same source as the price line under the plan
  // list, so the card and that line always show one currency symbol and one
  // decimal format. Reformatting `product.price` locally would follow the
  // device locale instead of the storefront and the two would disagree.
  const {
    priceString,
    pricePerMonthString,
    subscriptionPeriod: period,
    identifier,
  } = product;

  const { periodUnit, periodValue } = getPeriodDetails(period || "");

  const totalPriceLabel = `${priceString}/${t(`plans.${periodUnit}`)}`;

  // `pricePerMonthString` is null for one-off products, where the total is the
  // only amount we can show.
  const pricePerMonthLabel = pricePerMonthString
    ? `${pricePerMonthString}/${t("plans.M")}`
    : null;

  // A single month already reads as "X/mo", so the total would just repeat it.
  const showTotalPrice = !(periodUnit === "M" && periodValue === 1);

  // Keyed off the package type, not the product id: on Google Play a
  // RevenueCat product identifier is `subscriptionId:basePlanId`, so matching
  // on the bare id sent every Android row to the raw store title. The product
  // ids stay as a fallback for offerings that arrive with a custom type.
  const translatedPlanName = (() => {
    switch (pkg.packageType) {
      case "ANNUAL":
        return t("plans.yearly");
      case "MONTHLY":
        return t("plans.monthly");
      case "WEEKLY":
        return t("plans.weekly");
    }

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
        <Price
          color="subtitle"
          fontSize="md"
          fontWeight="semibold"
          style={planPackagesStyles.price}
        >
          {pricePerMonthLabel ?? totalPriceLabel}
          {pricePerMonthLabel && showTotalPrice ? (
            <Text color="subtitle" fontSize="md">
              {` (${totalPriceLabel})`}
            </Text>
          ) : null}
        </Price>
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
