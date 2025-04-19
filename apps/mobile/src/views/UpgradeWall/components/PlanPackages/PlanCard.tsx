import * as React from "react";
import { PurchasesPackage } from "react-native-purchases";
import { useTranslation } from "react-i18next";

import { Text } from "@/components/Text";
import { Checkbox } from "@/views/UpgradeWall/components/Checkbox";
import {
  Flex,
  PercentContainer,
  PercentText,
  PlanContainer,
  Price
} from "@/views/UpgradeWall/components/PlanPackages/styles";

interface PlanCardProps {
  selected: boolean;
  onPress: () => void;
  planPackage: PurchasesPackage;
  oldPrice?: number;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  selected,
  onPress,
  planPackage: pkg,
  oldPrice
}) => {
  const { t } = useTranslation();
  const { product } = pkg;

  const {
    price: currentPrice,
    currencyCode,
    subscriptionPeriod: period,
    identifier
  } = product;

  const formatPrice = (value: number, currency: string) =>
    Intl.NumberFormat("default", {
      style: "currency",
      currency
    }).format(value);

  const getPeriodDetails = (
    period: string
  ): {
    periodUnit: "D" | "W" | "M" | "Y";
    periodValue: number;
  } => {
    const periodMatch = period.match(/P(\d+)(D|W|M|Y)/);
    const [, num, unit] = periodMatch!;

    if (!num || !unit) throw new Error("Invalid period format");

    return {
      periodUnit: unit as "D" | "W" | "M" | "Y",
      periodValue: parseInt(num, 10)
    };
  };

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

  const percentSaved = oldPrice
    ? Math.floor(((oldPrice - currentPrice) / oldPrice) * 100)
    : undefined;

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

  return (
    <PlanContainer selected={selected} onPress={onPress}>
      <Checkbox selected={selected} />
      <Flex>
        <Text fontSize="sm" fontWeight="semibold">
          {translatedPlanName}
        </Text>
        {pricePerMonth ? (
          <Price color="subtitle" fontSize="md" fontWeight="semibold">
            {formatPrice(pricePerMonth, currencyCode)}/{t("plans.M")}{" "}
            {percentSaved ? (
              <Text color="subtitle" fontSize="md">
                ({formattedCurrentPrice}/{t(`plans.${periodUnit}`)})
              </Text>
            ) : null}
          </Price>
        ) : null}
      </Flex>
      {percentSaved ? (
        <PercentContainer>
          <PercentText fontSize="sm" fontWeight="semibold">
            {t("plans.save", { percent: percentSaved })}
          </PercentText>
        </PercentContainer>
      ) : null}
    </PlanContainer>
  );
};
