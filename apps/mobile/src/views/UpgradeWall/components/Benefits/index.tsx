import * as React from "react";
import { useTranslation } from "react-i18next";

import SwipeBackArrow from "@/assets/images/SwipeBackArrow.svg";
import { Text } from "@/components/Text";
import AdsOff from "@/views/UpgradeWall/assets/AdsOff.svg";
import HighPriority from "@/views/UpgradeWall/assets/HighPriority.svg";
import Infinite from "@/views/UpgradeWall/assets/Infinite.svg";
import {
  BenefitContainer,
  BenefitIconContainer,
  Container,
  ContentContainer
} from "@/views/UpgradeWall/components/Benefits/styles";

const Benefits: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Container>
      <BenefitContainer>
        <BenefitIconContainer color="#25F714">
          <HighPriority fill="#25F714" width={23} height={23} />
        </BenefitIconContainer>
        <ContentContainer>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.priorityQueue")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.getSeenFirst")}
          </Text>
        </ContentContainer>
      </BenefitContainer>

      <BenefitContainer>
        <BenefitIconContainer color="#09EAFF">
          <Infinite color="#09EAFF" width={28} height={28} />
        </BenefitIconContainer>
        <ContentContainer>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.unlimitedLikes")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.noDailyLimits")}
          </Text>
        </ContentContainer>
      </BenefitContainer>

      <BenefitContainer>
        <BenefitIconContainer color="#E43CFF">
          <SwipeBackArrow fill="#E43CFF" width={18} height={18} />
        </BenefitIconContainer>
        <ContentContainer>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.rewind")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.madeAMistake")}
          </Text>
        </ContentContainer>
      </BenefitContainer>

      <BenefitContainer>
        <BenefitIconContainer color="#FFB800">
          <AdsOff fill="#FFB800" width={20} height={20} />
        </BenefitIconContainer>
        <ContentContainer>
          <Text fontWeight="semibold" fontSize="sm">
            {t("plans.benefits.noAds")}
          </Text>
          <Text color="subtitle" fontSize="sm" fontWeight="semibold">
            {t("plans.benefits.noAdsDescription")}
          </Text>
        </ContentContainer>
      </BenefitContainer>
    </Container>
  );
};

export default Benefits;
