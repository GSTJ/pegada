import type { PurchasesPackage } from "react-native-purchases";

import { useEffect } from "react";
import * as React from "react";
import { View } from "react-native";

import * as Device from "expo-device";
import { useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";

import { useOfferings } from "@/hooks/use-payments";
import { styles as planPackagesStyles } from "@/views/UpgradeWall/components/PlanPackages/styles";

import { PlanCard } from "./plan-card";
import { getYearlySavingPercent } from "./saving-percent";
import { sortPlanPackages } from "./sort-packages";

type OfferingsProps = {
  selectedPackage: PurchasesPackage | null | undefined;
  setSelectedPackage: (pkg: PurchasesPackage) => void;
};

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
    ? sortPlanPackages(offeringsData.availablePackages)
    : [];

  const annualPackage =
    offeringsData?.annual ??
    packageList.find((pkg) => pkg.packageType === "ANNUAL");

  const monthlyPackage =
    offeringsData?.monthly ??
    packageList.find((pkg) => pkg.packageType === "MONTHLY");

  const weeklyPackage =
    offeringsData?.weekly ??
    packageList.find((pkg) => pkg.packageType === "WEEKLY");

  // Yearly first: preselect the annual package when the offering has one, and
  // otherwise fall back to the first row in the list.
  // Both are stable references from the offerings query, so the effect below
  // does not re-run on every render even though `packageList` is rebuilt.
  const defaultPackage = annualPackage ?? packageList[0];

  useEffect(() => {
    if (defaultPackage && !selectedPackage) {
      setSelectedPackage(defaultPackage);
    }
  }, [defaultPackage, selectedPackage, setSelectedPackage]);

  // What a year of paying as you go would cost against the yearly price.
  const yearlySavingPercent = getYearlySavingPercent({
    monthlyPrice: monthlyPackage?.product.price,
    weeklyPrice: weeklyPackage?.product.price,
    yearlyPrice: annualPackage?.product.price,
  });

  return (
    <View style={planPackagesStyles.container}>
      {packageList.map((planPackage) => (
        <PlanCard
          key={planPackage.identifier}
          selected={selectedPackage?.identifier === planPackage.identifier}
          onPress={() => setSelectedPackage(planPackage)}
          planPackage={planPackage}
          savingPercent={
            planPackage.identifier === annualPackage?.identifier
              ? yearlySavingPercent
              : undefined
          }
        />
      ))}
    </View>
  );
};

export default PlanPackages;
