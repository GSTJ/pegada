import type { ReportReason } from "@pegada/shared/analytics/events";

import { useState } from "react";
import * as React from "react";
import { ActivityIndicator, Linking, TextInput, View } from "react-native";

import i18n from "i18next";
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
import { sendError } from "@/services/error-tracking";

import { styles } from "./styles";

/** Kept in step with `REPORT_DETAILS_MAX_LENGTH` in the API's report route. */
const DETAILS_MAX_LENGTH = 500;

/**
 * Order matters: the two reasons that moderation acts on fastest come first,
 * and "something else" is last so it is not the path of least resistance.
 */
const REASONS = [
  { id: "fake_profile", labelKey: "reportSheet.reasonFakeProfile" },
  {
    id: "inappropriate_photos",
    labelKey: "reportSheet.reasonInappropriatePhotos",
  },
  { id: "harassment", labelKey: "reportSheet.reasonHarassment" },
  { id: "spam", labelKey: "reportSheet.reasonSpam" },
  { id: "other", labelKey: "reportSheet.reasonOther" },
  // `as const` rather than an annotation: `t` only accepts keys it knows, so
  // the label keys have to stay literal types.
] as const satisfies readonly { id: ReportReason; labelKey: string }[];

export type ReportedDog = { id: string; name: string };

/**
 * What reporting used to be, kept as the fallback for a failed mutation.
 *
 * A complaint nobody can read is still better than a complaint that vanishes,
 * so a person who taps send on a dead connection ends up where they used to
 * end up rather than nowhere.
 */
export const openReportMailto = async (dog: ReportedDog) => {
  await Linking.openURL(
    `mailto:report@pegada.app?subject=${encodeURIComponent(
      i18n.t("dogProfile.report"),
    )}&body=${encodeURIComponent(
      i18n.t("dogProfile.reportBody", { id: dog.id, name: dog.name }),
    )}`,
  );
};

const ReasonRow = ({
  label,
  selected,
  testID,
  onPress,
}: {
  label: string;
  selected: boolean;
  testID: string;
  onPress: () => void;
}) => {
  return (
    <PressableArea
      testID={testID}
      // Without `accessible`, a Pressable wrapping bare Text is not one
      // accessibility element on iOS 26 Fabric. Same treatment as `FakeDoorRow`.
      accessible
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.reasonRow}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <Text
        fontWeight="medium"
        fontSize="sm"
        style={[styles.reasonLabel, selected && styles.reasonLabelSelected]}
      >
        {label}
      </Text>
    </PressableArea>
  );
};

const ReportSheetContent = ({
  dog,
  onReported,
}: {
  dog: ReportedDog;
  onReported: () => void;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useUnistyles();
  const { hide } = useMagicModal();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");

  const [firstName] = dog.name.split(" ");

  const createReport = api.report.create.useMutation({
    onSuccess: () => {
      hide(undefined);
      magicToast.success(t("reportSheet.success"));
      onReported();
    },
    onError: async (error) => {
      sendError(error);
      hide(undefined);

      try {
        await openReportMailto(dog);
      } catch (mailtoError) {
        sendError(mailtoError);
        magicToast.alert(t("reportSheet.failed"));
        return;
      }

      onReported();
    },
  });

  const handleSubmit = () => {
    if (!reason || createReport.isPending) return;

    createReport.mutate({
      targetType: "dog",
      targetId: dog.id,
      reason,
      details: details.trim() || undefined,
    });
  };

  const submitDisabled = !reason || createReport.isPending;

  return (
    <View
      style={[styles.overlay, { paddingBottom: insets.bottom || undefined }]}
    >
      <View style={styles.sheet}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
        <Text fontWeight="medium" fontSize="lg" style={styles.title}>
          {t("reportSheet.title", { name: firstName })}
        </Text>
        <Text fontSize="xs" style={styles.subtitle}>
          {t("reportSheet.subtitle")}
        </Text>
        <Divider style={styles.titleDivider} />

        {REASONS.map((item) => (
          <ReasonRow
            key={item.id}
            testID={`report-reason-${item.id}`}
            label={t(item.labelKey)}
            selected={reason === item.id}
            onPress={() => setReason(item.id)}
          />
        ))}

        <Text fontSize="xs" style={styles.detailsLabel}>
          {t("reportSheet.detailsLabel")}
        </Text>
        <TextInput
          testID="report-details"
          accessibilityLabel={t("reportSheet.detailsLabel")}
          multiline
          maxLength={DETAILS_MAX_LENGTH}
          value={details}
          onChangeText={setDetails}
          placeholder={t("reportSheet.detailsPlaceholder")}
          placeholderTextColor={theme.colors.subtitle}
          style={styles.detailsInput}
        />

        <PressableArea
          testID="report-submit"
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("reportSheet.submit")}
          accessibilityState={{ disabled: submitDisabled }}
          disabled={submitDisabled}
          onPress={handleSubmit}
          style={[
            styles.submitButton,
            submitDisabled && styles.submitButtonDisabled,
          ]}
        >
          {createReport.isPending ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text fontWeight="bold" fontSize="lg" style={styles.submitLabel}>
              {t("reportSheet.submit")}
            </Text>
          )}
        </PressableArea>
      </View>

      <PressableArea
        testID="report-cancel"
        accessible
        accessibilityRole="button"
        accessibilityLabel={t("reportSheet.cancel")}
        onPress={() => hide(undefined)}
        style={styles.cancelButton}
      >
        <Text fontWeight="bold" fontSize="lg" style={styles.cancelLabel}>
          {t("reportSheet.cancel")}
        </Text>
      </PressableArea>
    </View>
  );
};

/**
 * The report sheet. Five reasons and one optional box, because the complaint
 * has to be countable per reason: the kill criterion for the seeded team dogs
 * in #273 is a number of reports, and the mailto this replaces produced none.
 *
 * `onReported` runs after a report is filed, and also after the mailto
 * fallback, so the reported dog leaves the deck either way.
 */
export const showReportSheet = (dog: ReportedDog, onReported: () => void) =>
  magicModal.show(
    () => <ReportSheetContent dog={dog} onReported={onReported} />,
    {
      style: { justifyContent: "flex-end" },
      swipeDirection: "down",
      entering: FadeInDown.duration(220),
      exiting: FadeOutDown.duration(200),
    },
  );
