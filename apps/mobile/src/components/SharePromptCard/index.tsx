import type { SharePromptPlacement } from "./tracking";
import type { ShareableDog } from "@/components/DogShareOptions/types";

import * as React from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { magicModal, useMagicModal } from "react-native-magic-modal";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Premium from "@/assets/images/Premium.svg";
import { Button } from "@/components/Button";
import { showDogShareOptions } from "@/components/DogShareOptions";
import { pickByGender } from "@/components/DogShareOptions/story/gender";
import { FakeDoorRow } from "@/components/FakeDoor";
import { PressableArea } from "@/components/pressable-area";
import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";

import { styles } from "./styles";
import { trackSharePromptTapped, useSharePromptShown } from "./tracking";

export type { SharePromptPlacement } from "./tracking";

/**
 * Asks the user to share their own dog, at the two moments they have the most
 * reason to: an empty deck (nobody left to swipe, so bring someone) and the
 * first match (the app just worked, so say so).
 *
 * One component for both, because the ask is the same and the funnel has to
 * be comparable across placements. `placement` is the only thing that differs,
 * and it rides all the way through to the share sheet as its `source`.
 */
export const SharePromptCard = ({
  placement,
  onShare,
}: {
  placement: SharePromptPlacement;
  /** Runs instead of opening the sheet directly, so the first-match
   * placement can close its own modal before the share sheet opens. */
  onShare?: (dog: ShareableDog) => void;
}) => {
  const { t } = useTranslation();

  // Not `useSuspenseQuery`: this hangs off an empty state and off the modal
  // portal, neither of which should go blank while the dog loads.
  const { data: dog } = api.myDog.get.useQuery(undefined, {
    refetchOnMount: false,
  });

  useSharePromptShown(placement, dog?.id);

  if (!dog) return null;

  const [firstName] = dog.name.split(" ");

  const handleShare = () => {
    trackSharePromptTapped(placement, dog.id);

    if (onShare) {
      onShare(dog);
      return;
    }

    void showDogShareOptions(dog, placement);
  };

  return (
    <View testID="share-prompt-card" style={styles.card}>
      <Text fontWeight="bold" fontSize="lg" style={styles.title}>
        {t(
          pickByGender(
            dog.gender,
            "sharePrompt.titleMale",
            "sharePrompt.titleFemale",
          ),
          { name: firstName },
        )}
      </Text>
      <Text fontSize="xs" style={styles.subtitle}>
        {t(
          pickByGender(
            dog.gender,
            "sharePrompt.subtitleMale",
            "sharePrompt.subtitleFemale",
          ),
          { name: firstName },
        )}
      </Text>
      <Button testID="share-prompt-button" onPress={handleShare}>
        {t("sharePrompt.button")}
      </Button>
      {placement === "empty_deck" ? (
        <FakeDoorRow
          compact
          testID="fake-door-referral"
          feature="referral_reward"
          source="empty_deck"
          icon={Premium}
          label={t("fakeDoor.referralReward")}
        />
      ) : null}
    </View>
  );
};

const SharePromptSheet = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { hide } = useMagicModal<ShareableDog | undefined>();

  return (
    <View
      style={[styles.overlay, { paddingBottom: insets.bottom || undefined }]}
    >
      <View style={styles.sheet}>
        <View style={styles.handleContainer}>
          <View style={styles.handleBar} />
        </View>
        <View style={styles.sheetCard}>
          <SharePromptCard placement="first_match" onShare={hide} />
        </View>
        <PressableArea
          testID="share-prompt-dismiss"
          accessible
          accessibilityRole="button"
          accessibilityLabel={t("sharePrompt.dismiss")}
          onPress={() => hide(undefined)}
          style={styles.dismissButton}
        >
          <Text fontWeight="medium" fontSize="sm" style={styles.dismissLabel}>
            {t("sharePrompt.dismiss")}
          </Text>
        </PressableArea>
      </View>
    </View>
  );
};

/**
 * The first-match placement, as a bottom sheet over whatever screen the match
 * exit landed on.
 *
 * The share sheet opens only after this one has finished closing, by awaiting
 * the modal's own handle: showing it from inside the prompt would stack two
 * sheets, and dismissing the top one would leave the prompt sitting there.
 */
export const showSharePromptModal = async () => {
  const result = await magicModal.show<ShareableDog | undefined>(
    () => <SharePromptSheet />,
    {
      style: { justifyContent: "flex-end" },
      swipeDirection: "down",
      entering: FadeInDown.duration(220),
      exiting: FadeOutDown.duration(200),
    },
  );

  if ("data" in result && result.data) {
    void showDogShareOptions(result.data, "first_match");
  }
};
