import { useState } from "react";
import { Alert, Keyboard, Pressable, View } from "react-native";

import { useRouter } from "expo-router";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

import { OTPRequiredError } from "@pegada/shared/errors/errors";
import { Trans, useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import { Button } from "@/components/Button";
import { PendingDogProfileBanner } from "@/components/PendingDogProfileBanner";
import { api } from "@/contexts/trpc-provider";
import { useKeyboardAwareSafeAreaInsets } from "@/hooks/use-keyboard-aware-safe-area-insets";
import { useKeyboardOverlap } from "@/hooks/use-keyboard-aware-scroll";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { getError } from "@/services/get-error";
import { LOGIN_PLATFORM, usePendingReferral } from "@/services/referral";
import {
  shouldRetryTransient,
  transientRetryDelayMs,
} from "@/services/transient-retry";
import { SceneName } from "@/types/scene-name";

import EmailInput from "./components/EmailInput";
import HeroText from "./components/HeroText";
import {
  Container,
  Description,
  Highlight,
  LOGO_MARGIN_BOTTOM,
  LogoStyled,
  Title,
  TopCard,
  styles,
} from "./styles";

export const useCustomBottomInset = () => {
  const insets = useKeyboardAwareSafeAreaInsets();
  const { theme } = useUnistyles();
  return Math.max(theme.spacing[4], insets.bottom + theme.spacing[1]);
};

const requestTrackingPermissions = async () => {
  try {
    await requestTrackingPermissionsAsync();
  } catch (error) {
    sendError(error);
  }
};

const LOGO_SIZE = 70;
/** The logo's own height plus the gap it keeps under itself. */
const LOGO_BLOCK = LOGO_SIZE + LOGO_MARGIN_BOTTOM;

/**
 * The hero's height is whatever the card below leaves, so a mounted banner or
 * a taller keyboard takes it away. This decides what still fits in it: the
 * logo goes first, the headline last, and neither is ever painted half.
 *
 * The two spacers around them are already the breathing room and they shrink
 * to nothing before this has to drop anything, so the thresholds are the bare
 * heights. Anything more and an iPhone 17 Pro with no banner, which has room
 * for both, would lose its logo.
 *
 * `room` comes from the flex layout and does not depend on what this returns,
 * and `heroHeight` is the headline's natural height, measured once and kept.
 * Both are stable inputs, so dropping the logo cannot change the answer that
 * dropped it.
 */
const heroFit = ({
  room,
  heroHeight,
}: {
  room: number | undefined;
  heroHeight: number | undefined;
}) => {
  if (room === undefined || heroHeight === undefined) {
    return { showLogo: true, showHero: true };
  }

  return {
    showLogo: room >= heroHeight + LOGO_BLOCK,
    showHero: room >= heroHeight,
  };
};

const InsertEmail = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = useCustomBottomInset();
  const { theme } = useUnistyles();

  const [heroSpace, setHeroSpace] = useState<number | undefined>(undefined);
  const [heroHeight, setHeroHeight] = useState<number | undefined>(undefined);
  // Measured once. The headline is hidden by the very state this measures, so
  // remeasuring it would feed the layout back its own answer.
  const measureHero = (height: number) =>
    setHeroHeight((current) => current ?? height);

  const { showLogo, showHero } = heroFit({ room: heroSpace, heroHeight });

  // The email field autofocuses, so the keyboard is up on the first frame of a
  // cold launch and this screen is the one that has to survive it.
  const keyboardOverlap = useKeyboardOverlap();

  const router = useRouter();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  // This screen's submit is what creates the account row: it asks for a code,
  // and `sendVerification` upserts the User. The attribution columns are
  // create-only, so if the referral is not on this request it is never written.
  const referral = usePendingReferral();

  const loginMutation = api.authentication.login.useMutation({
    // The first request of a cold deployment is the one that fails, and
    // mutations do not retry by default. See services/transient-retry.ts for
    // why this is safe to retry and why OTP_REQUIRED never is.
    retry: shouldRetryTransient,
    retryDelay: transientRetryDelayMs,
    onError: (error) => {
      // Resend code
      if (getError(error, OTPRequiredError)) {
        // The server answers a first login with OTP_REQUIRED, so this branch is
        // the success path: the code was sent and the OTP screen is next.
        analytics.track({
          event_type: "OTP Requested",
          event_properties: { resend: false },
        });

        // Fire-and-forget: the OTP screen must not wait on the ATT prompt.
        // `void` rather than a chained catch, which `promise/no-promise-in-callback`
        // (rightly) reads as a second error path inside a callback.
        void requestTrackingPermissions();

        return router.push({
          pathname: SceneName.OneTimeCode,
          params: { email },
        });
      }

      Alert.alert(t("common.oops"), t("insertEmail.loginError"));
      sendError(error);
    },
  });

  const handleLogin = () => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isValidEmail) {
      return setError(t("insertEmail.validEmail"));
    }

    // The top of the funnel. Fired on a valid address only, so the drop-off to
    // "OTP Requested" measures the request and not a typo in the field.
    analytics.track({ event_type: "Sign In Email Submitted" });

    loginMutation.mutate({ email, referral, platform: LOGIN_PLATFORM });
  };

  return (
    <Pressable
      onPress={() => Keyboard.dismiss()}
      style={styles.pressableContainer}
      accessible={false}
    >
      {/*
        Not a KeyboardAvoidingView: `behavior` has to be left undefined on
        Android, where the component then does nothing at all, and this screen
        opens with the keyboard already up. `useKeyboardOverlap` gives the same
        padding the component would compute on iOS, on both platforms.
      */}
      <View
        style={[
          styles.keyboardAvoidingViewStyled,
          { paddingBottom: keyboardOverlap },
        ]}
      >
        <Container style={styles.container} edges={["left", "right"]}>
          <TopCard
            source={require("@/assets/images/background.webp")}
            style={[styles.topCard, { paddingTop: insets.top }]}
          >
            <View
              style={styles.heroSpace}
              onLayout={(event) =>
                setHeroSpace(event.nativeEvent.layout.height)
              }
            >
              <View style={styles.topSpacer} />
              {showLogo ? (
                <LogoStyled
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                  fill={theme.colors.text}
                  style={styles.logoStyled}
                />
              ) : null}
              {showHero ? (
                <View
                  onLayout={(event) =>
                    measureHero(event.nativeEvent.layout.height)
                  }
                >
                  <HeroText />
                </View>
              ) : null}
              <View style={styles.bottomSpacer} />
            </View>
          </TopCard>
          <View style={[styles.bottomCard, { paddingBottom: bottomInset }]}>
            <PendingDogProfileBanner />
            <Title style={styles.title} fontSize="xl" fontWeight="bold">
              {/*
                The leading text is an expression rather than bare JSX text on
                purpose. "insertEmail.insertEmail" is `Insert your <1>email</1>`,
                and react-i18next resolves `<1>` positionally against these
                children — so `Insert your <Highlight>` has to stay exactly two
                children. Written as text it does not: `<Highlight>` no longer
                fits on the line once the sheet and the two size props are on
                it, and the formatter splits the string off from its trailing
                space as `Insert your{" "}`, which pushes `<Highlight>` to index
                2 and binds `<1>` to the whitespace. The pink `email` then
                disappears from the headline.
              */}
              <Trans i18nKey="insertEmail.insertEmail">
                {"Insert your "}
                <Highlight
                  style={styles.highlight}
                  fontSize="xl"
                  fontWeight="bold"
                >
                  email
                </Highlight>
              </Trans>
            </Title>
            <Description style={styles.description}>
              {t("insertEmail.accountCode")}
            </Description>
            <EmailInput
              enablesReturnKeyAutomatically
              returnKeyType="send"
              onSubmitEditing={handleLogin}
              blurOnSubmit={false}
              placeholder={t("insertEmail.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              error={error}
            />
            <Button
              loading={loginMutation.isPending}
              onPress={handleLogin}
              testID="signin-submit"
            >
              {t("insertEmail.continue")}
            </Button>
          </View>
        </Container>
      </View>
    </Pressable>
  );
};

export default InsertEmail;
