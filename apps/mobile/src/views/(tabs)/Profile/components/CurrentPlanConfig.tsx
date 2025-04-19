import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components/native";

import Premium from "@/assets/images/Badge.svg";
import Loading from "@/components/Loading";
import { useCustomerPlan } from "@/hooks/usePayments";
import { UserPlan } from "@/services/payments";
import { SceneName } from "@/types/SceneName";
import { Config } from "./Config";

const PlanLoading = styled.View`
  width: 18px;
  height: 18px;
  transform: translateY(2px) translateX(-12px);
`;

const StyledLoading = styled(Loading)`
  height: 12px;
`;

export const CurrentPlanConfig = () => {
  const plan = useCustomerPlan();
  const { t } = useTranslation();

  const router = useRouter();
  const theme = useTheme();

  const userPlan = plan.data?.userPlan;

  const expirationDate = plan.data?.expirationDate
    ? format(plan.data?.expirationDate, "MMM do")
    : null;

  const handlePress = () => {
    if (plan.isError) {
      return plan.refetch();
    }

    if (userPlan === UserPlan.Free) {
      return router.push(SceneName.UpgradeWall);
    }

    if (Platform.OS === "android") {
      return Linking.openURL(
        `https://play.google.com/store/account/subscriptions?package=${Constants.expoConfig?.android?.package}`
      );
    }

    return Linking.openURL(`https://apps.apple.com/account/subscriptions`);
  };

  return (
    <Config.Root disabled={plan.isLoading} onPress={handlePress}>
      <Premium width={22} height={22} fill={theme.colors.text} />
      <Config.Container>
        <Config.Title>{t("profile.plan.currentPlan")}</Config.Title>
        {plan.isLoading ? (
          <PlanLoading>
            <StyledLoading inverse />
          </PlanLoading>
        ) : null}
        {userPlan ? (
          <Config.Description>{t(`plans.${userPlan}`)}</Config.Description>
        ) : null}
        {plan.isError ? (
          <Config.Description color="destructive">
            {t("profile.plan.errorLoading")}
          </Config.Description>
        ) : null}
      </Config.Container>
      {!plan.isLoading ? (
        <Config.Description style={{ transform: [{ translateY: -2 }] }}>
          {userPlan === UserPlan.Free && t("profile.plan.upgradeToPremium")}
          {userPlan === UserPlan.Premium &&
            t("profile.plan.until", { date: expirationDate })}
          {plan.isError ? t("profile.plan.clickToRetry") : null}
        </Config.Description>
      ) : null}
      <Config.Arrow />
    </Config.Root>
  );
};
