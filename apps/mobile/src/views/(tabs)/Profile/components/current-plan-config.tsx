import { Linking, Platform, View } from "react-native";

import Constants from "expo-constants";
import { useRouter } from "expo-router";

import { format } from "date-fns/format";
import { useTranslation } from "react-i18next";
import {
  StyleSheet,
  withUnistyles,
  useUnistyles,
} from "react-native-unistyles";

import Premium from "@/assets/images/Badge.svg";
import Loading from "@/components/loading";
import { useCustomerPlan } from "@/hooks/use-payments";
import { UserPlan } from "@/services/payments";
import { SceneName } from "@/types/scene-name";

import { Config } from "./Config";

export const CurrentPlanConfig = () => {
  const plan = useCustomerPlan();
  const { t } = useTranslation();

  const router = useRouter();
  const { theme } = useUnistyles();

  const userPlan = plan.data?.userPlan;

  const expirationDate = plan.data?.expirationDate
    ? format(plan.data?.expirationDate, "MMM do")
    : null;

  const handlePress = () => {
    if (plan.isError) {
      return plan.refetch();
    }

    if (userPlan === UserPlan.Free) {
      return router.push({
        pathname: SceneName.UpgradeWall,
        params: { trigger: "profile_plan" },
      });
    }

    if (Platform.OS === "android") {
      return Linking.openURL(
        `https://play.google.com/store/account/subscriptions?package=${Constants.expoConfig?.android?.package}`,
      );
    }

    return Linking.openURL(`https://apps.apple.com/account/subscriptions`);
  };

  // testID disambiguates the upgrade CTA vs the manage-subscription CTA
  // so Maestro can assert on the pre/post-purchase state of this row.
  const testID =
    userPlan === UserPlan.Premium
      ? "profile-current-plan-premium"
      : "profile-current-plan-upgrade";

  return (
    <Config.Root
      testID={testID}
      disabled={plan.isLoading}
      onPress={handlePress}
    >
      <Premium width={22} height={22} fill={theme.colors.text} />
      <Config.Container>
        <Config.Title>{t("profile.plan.currentPlan")}</Config.Title>
        {plan.isLoading ? (
          <View style={styles.planLoading}>
            <StyledLoading inverse style={styles.styledLoading} />
          </View>
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
      {plan.isLoading ? null : (
        <Config.Description style={{ transform: [{ translateY: -2 }] }}>
          {userPlan === UserPlan.Free && t("profile.plan.upgradeToPremium")}
          {userPlan === UserPlan.Premium &&
            t("profile.plan.until", { date: expirationDate })}
          {plan.isError ? t("profile.plan.clickToRetry") : null}
        </Config.Description>
      )}
      <Config.Arrow />
    </Config.Root>
  );
};

const styles = StyleSheet.create({
  planLoading: {
    width: 18,
    height: 18,
    transform: [{ translateX: -12 }, { translateY: 2 }],
  },
  styledLoading: {
    height: 12,
  },
});

const StyledLoading = withUnistyles(Loading);
