import { View } from "react-native";

import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as StoreReview from "expo-store-review";

import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useIsFocused, useScrollToTop } from "@react-navigation/native";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import Dog from "@/assets/images/Dog.svg";
import Erase from "@/assets/images/Erase.svg";
import Filters from "@/assets/images/Filters.svg";
import Paperwork from "@/assets/images/Paperwork.svg";
import SignOut from "@/assets/images/SignOut.svg";
import Divider from "@/components/divider";
import { Text } from "@/components/text";
import { useWarmUpBrowser } from "@/hooks/use-warm-up-browser";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { openWebBrowser } from "@/services/open-web-browser";
import { StorageKeys, storeData } from "@/services/storage";
import { SceneName } from "@/types/scene-name";

import { Config } from "./components/Config";
import { CurrentPlanConfig } from "./components/current-plan-config";
import { LanguageConfig } from "./components/language-config";
import { LocationConfig } from "./components/location-config";
import { ThemeConfig } from "./components/theme-config";
import UserDogProfileHeader, {
  useDogProfileHeight,
  WrappedProfileShareButton,
} from "./components/UserDogProfileHeader";
import { settingsScroll, styles } from "./styles";
import { deleteAccount } from "./utils/delete-account";
import { handleLogout } from "./utils/handle-logout";

const openTermsOfUse = () => {
  analytics.track({ event_type: "Open Terms Of Use" });
  openWebBrowser(t("links.termsOfUse")).catch(sendError);
};

const openPrivacyPolicy = () => {
  analytics.track({ event_type: "Open Privacy Policy" });
  openWebBrowser(t("links.privacyPolicy")).catch(sendError);
};

const openRateTheApp = async () => {
  try {
    analytics.track({ event_type: "App Review" });
    await StoreReview.requestReview();
    await storeData(StorageKeys.AppReviewStatus, "completed");
  } catch (error) {
    sendError(error);
  }
};

const Profile = () => {
  const { t } = useTranslation();

  const router = useRouter();

  const { theme } = useUnistyles();

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useScrollViewOffset(scrollRef);
  useScrollToTop(scrollRef);

  useWarmUpBrowser();

  const TRANSITION_POINT = 30;

  const imgStyle = useAnimatedStyle(() => {
    "worklet";
    // should scale down the image a little
    const scale = interpolate(
      scrollY.value,
      [0, TRANSITION_POINT],
      [1, 0.97],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(
      scrollY.value,
      [0, TRANSITION_POINT],
      [0, 0.7],
      Extrapolation.CLAMP,
    );

    return { opacity };
  });

  const insets = useSafeAreaInsets();

  const marginTop = insets.top + 5;

  const dogProfileHeight = useDogProfileHeight();

  // The photo header is never actually removed from the tree — it is a fixed
  // background layer that the settings ScrollView's own opaque content
  // scrolls up and over. It reads as "hidden" once that opaque content has
  // scrolled past the header's full height, i.e. once `scrollY` has covered
  // the same distance as the ScrollView's `paddingTop` below
  // (`dogProfileHeight - marginTop`). The share button lives outside the
  // header's `imgStyle`/`overlayStyle` tree (see the comment on
  // `ProfileShareButton`), so it needs its own opacity tied to that same
  // distance to disappear in step with the photo instead of floating over
  // the settings list forever.
  //
  // The button is rendered as the LAST sibling in this screen's tree (see
  // `WrappedProfileShareButton`'s own comment), which is what lets it paint
  // on top of the settings ScrollView while the photo is still visible —
  // but that same stacking means a fully faded (`opacity: 0`) button is
  // still the topmost node over whatever settings row now occupies that
  // corner, and a `Pressable` captures touches for its whole frame
  // regardless of opacity. `pointerEvents` has to fade out in lockstep with
  // `opacity` — not just at the end of the animation — so the button stops
  // intercepting taps before it visually disappears rather than only after.
  // Folded into this same worklet (rather than a separate
  // `useAnimatedProps`) because `pointerEvents` is a plain `ViewStyle` key
  // here, and `useAnimatedStyle` is the pattern already used everywhere
  // else in this codebase for scroll-driven values.
  const shareButtonStyle = useAnimatedStyle(() => {
    "worklet";
    const hidePoint = Math.max(
      dogProfileHeight - marginTop,
      TRANSITION_POINT + 1,
    );

    const opacity = interpolate(
      scrollY.value,
      [0, hidePoint],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return { opacity, pointerEvents: opacity < 0.5 ? "none" : "auto" };
  });

  const isFocused = useIsFocused();

  useFocusEffect(() => {
    // Hint to the user that there is more content to scroll
    scrollRef.current?.flashScrollIndicators();
  });

  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View testID="profile-screen" style={styles.container}>
      {isFocused ? <StatusBar style="light" /> : null}
      <View style={styles.backgroundProfileContainer}>
        <Animated.View style={imgStyle}>
          <UserDogProfileHeader />
        </Animated.View>
        <Animated.View style={[styles.backgroundOverlay, overlayStyle]} />
      </View>
      <View
        style={[
          styles.scrollContainer,
          {
            marginTop,
            borderBottomWidth: theme.stroke.sm,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Animated.ScrollView
          bounces={false}
          contentContainerStyle={[
            settingsScroll,
            { paddingTop: dogProfileHeight - marginTop },
          ]}
          ref={scrollRef}
          scrollEventThrottle={16}
          stickyHeaderIndices={[0]}
          style={styles.settingsList}
        >
          {/*
            The sticky header, and the outer view stays bare on purpose.
            ScrollView does not render a sticky child directly: it wraps the
            child in an Animated.View of its own, moves the child's `style` up
            onto that wrapper and hands the child `{ flex: 1 }` in its place
            (ScrollViewStickyHeader). A sheet written on the child therefore
            paints on a node Unistyles was never handed, so it keeps the theme
            the screen booted with — white "Settings" on a white band after a
            switch to dark, with every other row on the screen following along.

            One level down the painted node is the node the sheet was passed
            to, which is the node the runtime updates. The wrapper sizes to
            this subtree either way, which is also how it sized before the
            migration, when the style lived below the wrapper too.
          */}
          <View>
            <View style={styles.content}>
              <Text fontWeight="bold" fontSize="lg">
                {t("profile.settings")}
              </Text>
            </View>
          </View>
          <View
            // The settings block owns the opaque background below the photo
            // header: it pads past the floating tab bar so no grey gap shows
            // at scroll end.
            style={[
              styles.settingsBlock,
              { paddingBottom: theme.spacing[4] + tabBarHeight },
            ]}
          >
            <LocationConfig />
            <CurrentPlanConfig />

            <Config.Root
              testID="profile-open-preferences"
              onPress={() => router.push(SceneName.Preferences)}
            >
              <Filters width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.matchPreferences")}</Config.Title>
                <Config.Description>
                  {t("profile.matchPreferencesDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Config.Root
              testID="profile-open-edit"
              onPress={() => router.push(SceneName.EditProfile)}
            >
              <Dog width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.editProfile")}</Config.Title>
                <Config.Description>
                  {t("profile.editProfileDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <LanguageConfig />
            <ThemeConfig />

            <Divider style={{ margin: theme.spacing[4] }} />

            <Config.Root testID="profile-open-terms" onPress={openTermsOfUse}>
              <Paperwork width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.termsOfUse")}</Config.Title>
                <Config.Description>
                  {t("profile.termsOfUseDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Config.Root
              testID="profile-open-privacy"
              onPress={openPrivacyPolicy}
            >
              <Paperwork width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.privacyPolicy")}</Config.Title>
                <Config.Description>
                  {t("profile.privacyPolicyDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Config.Root testID="profile-open-rate" onPress={openRateTheApp}>
              <Paperwork width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.rateTheApp")}</Config.Title>
                <Config.Description>
                  {t("profile.rateTheAppDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Divider style={{ margin: theme.spacing[4] }} />

            <Config.Root testID="profile-logout" onPress={handleLogout}>
              <SignOut width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.logout")}</Config.Title>
              </Config.Container>
            </Config.Root>

            <Config.Root
              testID="profile-delete-account"
              onPress={deleteAccount}
            >
              <Erase width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title color="destructive">
                  {t("profile.deleteAccount")}
                </Config.Title>
              </Config.Container>
            </Config.Root>
          </View>
        </Animated.ScrollView>
      </View>
      <WrappedProfileShareButton animatedStyle={shareButtonStyle} />
    </View>
  );
};

export default Profile;
