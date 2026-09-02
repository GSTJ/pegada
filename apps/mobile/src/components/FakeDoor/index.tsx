import type { FakeDoorFeature, FakeDoorSource } from "./types";

import type { ComponentType } from "react";

import { useEffect, useRef, useState } from "react";
import * as React from "react";
import { Switch, View } from "react-native";

import { useTranslation } from "react-i18next";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { magicToast } from "react-native-magic-toast";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import Divider from "@/components/divider";
import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";

import { styles } from "./styles";
import {
  trackFakeDoorNotifyToggled,
  trackFakeDoorShown,
  trackFakeDoorTapped,
} from "./tracking";

type SvgIconProps = { width: number; height: number; fill: string };

const FakeDoorSheetContent = ({
  feature,
  label,
}: {
  feature: FakeDoorFeature;
  label: string;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { hide } = useMagicModal();

  const utils = api.useUtils();
  // Not `useSuspenseQuery`: this renders inside the modal portal, which sits
  // outside the screen's own Suspense boundary, so suspending here would take
  // the app down instead of showing a fallback.
  const savedQuery = api.featureInterest.list.useQuery();

  /**
   * `null` means "nobody has touched the switch in this sheet", which is the
   * only state where the server's answer should win. Once the user flips it,
   * their intent leads and the mutation catches up. A switch that springs
   * back while the request is in flight reads as a broken control.
   */
  const [pending, setPending] = useState<boolean | null>(null);
  const interested = pending ?? savedQuery.data?.includes(feature) ?? false;

  const setInterest = api.featureInterest.set.useMutation({
    onSuccess: () => utils.featureInterest.list.invalidate(),
    onError: () => {
      setPending(null);
      magicToast.alert(t("fakeDoor.saveFailed"));
    },
  });

  const handleToggle = (next: boolean) => {
    setPending(next);
    trackFakeDoorNotifyToggled(feature, next);
    setInterest.mutate({ feature, interested: next });
  };

  return (
    <View
      style={[styles.overlay, { paddingBottom: insets.bottom || undefined }]}
    >
      <View style={styles.sheet}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
        <Text fontWeight="medium" fontSize="lg" style={styles.title}>
          {t("fakeDoor.sheetTitle")}
        </Text>
        <Text fontSize="xs" style={styles.feature}>
          {label}
        </Text>
        <Divider style={styles.titleDivider} />
        <Text fontSize="sm" style={styles.body}>
          {t("fakeDoor.sheetBody")}
        </Text>
        <View style={styles.notifyRow}>
          <Text fontWeight="medium" fontSize="sm" style={styles.notifyLabel}>
            {t("fakeDoor.notifyMe")}
          </Text>
          <Switch
            testID="fake-door-notify-toggle"
            accessibilityLabel={t("fakeDoor.notifyMe")}
            value={interested}
            // Until the saved state has arrived, flipping the switch could
            // undo an interest the user registered on another device.
            disabled={savedQuery.isPending}
            onValueChange={handleToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
      </View>
      <PressableArea
        testID="fake-door-close"
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("fakeDoor.close")}
        onPress={() => hide(undefined)}
        style={styles.closeButton}
      >
        <Text fontWeight="bold" fontSize="lg">
          {t("fakeDoor.close")}
        </Text>
      </PressableArea>
    </View>
  );
};

/**
 * The "em breve" sheet behind every fake door. Opening it is the signal the
 * feature is wanted at all; the switch inside is the stronger signal, and the
 * only part that outlives the session.
 */
export const showFakeDoorSheet = (feature: FakeDoorFeature, label: string) =>
  magicModal.show(
    () => <FakeDoorSheetContent feature={feature} label={label} />,
    {
      style: { justifyContent: "flex-end" },
      swipeDirection: "down",
      entering: FadeInDown.duration(220),
      exiting: FadeOutDown.duration(200),
    },
  );

/**
 * One row advertising a feature that does not exist yet. Renders like a real
 * option so the tap rate means something, and says "em breve" so the tap is
 * not mistaken for a broken button.
 *
 * `Fake Door Shown` fires once per mount rather than once per feature: the
 * denominator of the funnel is how many people saw the row on this surface.
 */
export const FakeDoorRow = ({
  feature,
  source,
  icon: Icon,
  label,
  compact,
  disabled,
  testID,
}: {
  feature: FakeDoorFeature;
  source: FakeDoorSource;
  icon: ComponentType<SvgIconProps>;
  label: string;
  compact?: boolean;
  disabled?: boolean;
  testID?: string;
}) => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackFakeDoorShown(feature, source);
  }, [feature, source]);

  styles.useVariants({
    compact: compact ? true : undefined,
    disabled: disabled ? true : undefined,
  });

  const iconSize = compact ? 18 : 22;

  return (
    <PressableArea
      testID={testID}
      // Matching `ShareOptionRow`: without `accessible`, a Pressable wrapping
      // bare Text is not one accessibility element on iOS 26 Fabric.
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${t("fakeDoor.comingSoon")}`}
      disabled={disabled}
      onPress={() => {
        trackFakeDoorTapped(feature, source);
        void showFakeDoorSheet(feature, label);
      }}
      style={styles.row}
    >
      <View style={styles.rowIcon}>
        <Icon width={iconSize} height={iconSize} fill={theme.colors.text} />
      </View>
      <Text
        fontWeight="medium"
        fontSize={compact ? "xs" : "sm"}
        style={styles.rowLabel}
      >
        {label}
      </Text>
      <View style={styles.pill}>
        <Text fontWeight="bold" fontSize="xxs" style={styles.pillLabel}>
          {t("fakeDoor.comingSoon")}
        </Text>
      </View>
    </PressableArea>
  );
};
