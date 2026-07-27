import type { PurchasesPackage } from "react-native-purchases";

import { useEffect } from "react";
import * as React from "react";

import * as Device from "expo-device";
import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";

import { useOfferings } from "@/hooks/use-payments";
import { Container } from "@/views/UpgradeWall/components/PlanPackages/styles";

import { PlanCard } from "./plan-card";

const periodToDays = (period: string | null | undefined) => {
  if (!period) return 0;

  const match = period.match(/P(\d+)(D|W|M|Y)/);
  if (!match) return 0;

  const [, num, unit] = match;

  if (!num || !unit) throw new Error("Invalid period format");

  const numVal = Math.trunc(Number(num));

  switch (unit) {
    case "D":
      return numVal;
    case "W":
      return numVal * 7;
    case "M":
      return numVal * 30; // Approximation
    case "Y":
      return numVal * 365; // Approximation
    default:
      return 0;
  }
};

interface OfferingsProps {
  selectedPackage: PurchasesPackage | null | undefined;
  setSelectedPackage: (pkg: PurchasesPackage) => void;
}

const PlanPackages: React.FC<OfferingsProps> = ({
  selectedPackage,
  setSelectedPackage,
}) => {
  const router = useRouter();
  const { data: offeringsData, isError } = useOfferings();
  const { t } = useTranslation();

  useEffect(() => {
    if (isError) {
      magicToast.alert(
        Device.isDevice
          ? t("plans.errors.fetchingOfferingsDevice")
          : t("plans.errors.fetchingOfferings"),
      );

      router.back();
    }
  }, [isError, router, t]);

  const packageList = offeringsData
    ? Object.values(offeringsData.availablePackages).sort(
        // Highest price first
        (a, b) => b.product.price - a.product.price,
      )
    : [];

  const packageWithLessRelativeValue = offeringsData
    ? Object.values(offeringsData.availablePackages).sort((a, b) => {
        const relativeValueA =
          a.product.price / periodToDays(a.product.subscriptionPeriod);
        const relativeValueB =
          b.product.price / periodToDays(b.product.subscriptionPeriod);

        return relativeValueB - relativeValueA;
      })[0]
    : undefined;

  // `packageList` is rebuilt on every render, so depending on it would run
  // this effect every render. The first package is the only part that matters.
  const [defaultPackage] = packageList;

  useEffect(() => {
    if (defaultPackage && !selectedPackage) {
      // Optionally set a default package, or leave it to user interaction
      setSelectedPackage(defaultPackage);
    }
  }, [defaultPackage, selectedPackage, setSelectedPackage]);

  return (
    <Container>
      {packageList?.map((planPackage) => {
        // Get old price comparing with the package with less relative value / period * this package period
        const oldPrice = packageWithLessRelativeValue
          ? (packageWithLessRelativeValue.product.price /
              periodToDays(
                packageWithLessRelativeValue.product.subscriptionPeriod,
              )) *
            periodToDays(planPackage.product.subscriptionPeriod)
          : undefined;

        return (
          <PlanCard
            key={planPackage.identifier}
            selected={selectedPackage?.identifier === planPackage.identifier}
            onPress={() => setSelectedPackage(planPackage)}
            planPackage={planPackage}
            oldPrice={oldPrice}
          />
        );
      })}
    </Container>
  );
};

export default PlanPackages;
