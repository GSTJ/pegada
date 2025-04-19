import * as React from "react";
import { ActivityIndicator, Alert } from "react-native";
import { isDevice } from "expo-device";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { PressableArea } from "@/components/PressableArea";
import { Text } from "@/components/Text";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { payments } from "@/services/payments";

const RestorePurchases: React.FC = () => {
  const { t } = useTranslation();
  const restore = useMutation({
    mutationFn: payments.restorePurchases,
    onMutate: () => {
      analytics.track({ event_type: "RestorePurchases" });
    },
    onError: (err) => {
      sendError(err);

      // If it's a simulator, an error is expected
      if (!isDevice) return;

      Alert.alert(t("common.somethingWrong"), t("common.tryAgainLater"));
    },
    onSuccess: () => {
      router.back();
      analytics.track({ event_type: "Restore Purchases Success" });
    }
  });
  const theme = useTheme();

  return (
    <PressableArea
      hitSlop={{
        bottom: 10,
        left: 10,
        right: 10,
        top: 10
      }}
      disabled={restore.isPending}
      onPress={() => {
        restore.mutate();
      }}
    >
      {restore.isIdle ? (
        <Text fontWeight="medium" fontSize="sm">
          {t("plans.restorePurchases.restore")}
        </Text>
      ) : (
        <ActivityIndicator color={theme.colors.primary} />
      )}
    </PressableArea>
  );
};

export default RestorePurchases;
