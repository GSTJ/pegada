import { useEffect } from "react";
import { View } from "react-native";

import { useTranslation } from "react-i18next";
import { useUnistyles } from "react-native-unistyles";

import Dog from "@/assets/images/Dog.svg";
import { Text } from "@/components/text";
import { analytics } from "@/services/analytics";
import { usePendingDogProfileId } from "@/services/linking/handlers/pending-dog-profile";

import { styles } from "./styles";

/**
 * Sits above the title on SignIn and above the OTP input on OneTimeCode
 * when a `/dog/<id>` deep link (see app/dog/[id].tsx) is waiting for the
 * user to finish logging in.
 *
 * Product ask: cold-opening a shared dog profile while logged out must not
 * look like the app did nothing. No tap and no dismiss — the banner is a
 * passive notice, not an affordance, so it never disappears until the
 * pending id itself is consumed (by `usePendingDogProfile` in
 * services/linking/index.ts, once the user reaches Swipe after login).
 */
/**
 * The banner mounts twice per sign in (SignIn, then OneTimeCode) for the
 * same pending id, and both mounts are the same moment as far as the funnel
 * is concerned: "the user was told their link is waiting". Reported once per
 * id so the raw event count means what it reads like, not only the unique
 * user count a PostHog funnel would collapse it to anyway.
 */
let lastReportedId: string | undefined;

export const PendingDogProfileBanner = () => {
  const pendingDogProfileId = usePendingDogProfileId();
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  useEffect(() => {
    if (!pendingDogProfileId || pendingDogProfileId === lastReportedId) return;

    lastReportedId = pendingDogProfileId;
    analytics.track({ event_type: "Dog Link Sign In Banner Shown" });
  }, [pendingDogProfileId]);

  if (!pendingDogProfileId) return null;

  return (
    <View testID="signin-pending-dog-profile" style={styles.banner}>
      <Dog width={20} height={20} fill={theme.colors.text} />
      <View style={styles.textColumn}>
        <Text fontWeight="bold" style={styles.title}>
          {t("insertEmail.pendingDogProfileBanner.title")}
        </Text>
        <Text style={styles.body}>
          {t("insertEmail.pendingDogProfileBanner.body")}
        </Text>
      </View>
    </View>
  );
};

export default PendingDogProfileBanner;
