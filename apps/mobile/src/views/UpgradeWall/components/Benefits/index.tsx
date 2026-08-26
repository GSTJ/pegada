import * as React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";

import SwipeBackArrow from "@/assets/images/SwipeBackArrow.svg";
import { Text } from "@/components/text";
import AdsOff from "@/views/UpgradeWall/assets/AdsOff.svg";
import HighPriority from "@/views/UpgradeWall/assets/HighPriority.svg";
import Infinite from "@/views/UpgradeWall/assets/Infinite.svg";
import { styles } from "@/views/UpgradeWall/components/Benefits/styles";

const Benefits: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.benefitContainer}>
        <View style={styles.benefitIconContainer("#25F714")}>
          <HighPriority fill="#25F714" width={23} height={23} />
        </View>
        <View style={styles.contentContainer}>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.priorityQueue")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.getSeenFirst")}
          </Text>
        </View>
      </View>

      <View style={styles.benefitContainer}>
        <View style={styles.benefitIconContainer("#09EAFF")}>
          <Infinite color="#09EAFF" width={28} height={28} />
        </View>
        <View style={styles.contentContainer}>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.unlimitedLikes")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.noDailyLimits")}
          </Text>
        </View>
      </View>

      <View style={styles.benefitContainer}>
        <View style={styles.benefitIconContainer("#E43CFF")}>
          <SwipeBackArrow fill="#E43CFF" width={18} height={18} />
        </View>
        <View style={styles.contentContainer}>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.rewind")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.madeAMistake")}
          </Text>
        </View>
      </View>

      <View style={styles.benefitContainer}>
        <View style={styles.benefitIconContainer("#FFB800")}>
          <AdsOff fill="#FFB800" width={20} height={20} />
        </View>
        <View style={styles.contentContainer}>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.noAds")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.noAdsDescription")}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Benefits;
