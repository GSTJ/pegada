import { View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused, useScrollToTop } from "@react-navigation/native";
import { t } from "i18next";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import Dog from "@/assets/images/Dog.svg";
import Erase from "@/assets/images/Erase.svg";
import Filters from "@/assets/images/Filters.svg";
import Paperwork from "@/assets/images/Paperwork.svg";
import SignOut from "@/assets/images/SignOut.svg";
import Divider from "@/components/Divider";
import { Text } from "@/components/Text";
import { useWarmUpBrowser } from "@/hooks/useWarmUpBrowser";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/errorTracking";
import { openWebBrowser } from "@/services/openWebBrowser";
import { SceneName } from "@/types/SceneName";
import { Config } from "./components/Config";
import { CurrentPlanConfig } from "./components/CurrentPlanConfig";
import { LanguageConfig } from "./components/LanguageConfig";
import { LocationConfig } from "./components/LocationConfig";
import { ThemeConfig } from "./components/ThemeConfig";
import UserDogProfileHeader, {
  useDogProfileHeight
} from "./components/UserDogProfileHeader";
import {
  BackgroundOverlay,
  BackgroundProfileContainer,
  Container,
  Content,
  ScrollContainer,
  SettingsList
} from "./styles";
import { deleteAccount } from "./utils/deleteAccount";
import { handleLogout } from "./utils/handleLogout";

const openTermsOfUse = () => {
  analytics.track({ event_type: "Open Terms Of Use" });
  openWebBrowser(t("links.termsOfUse")).catch(sendError);
};

const openPrivacyPolicy = () => {
  analytics.track({ event_type: "Open Privacy Policy" });
  openWebBrowser(t("links.privacyPolicy")).catch(sendError);
};

const Profile = () => {
  const { t } = useTranslation();

  const router = useRouter();

  const theme = useTheme();

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
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }]
    };
  });

  const overlayStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(
      scrollY.value,
      [0, TRANSITION_POINT],
      [0, 0.7],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  const insets = useSafeAreaInsets();

  const marginTop = insets.top + 5;

  const isFocused = useIsFocused();

  useFocusEffect(() => {
    // Hint to the user that there is more content to scroll
    scrollRef.current?.flashScrollIndicators();
  });

  const dogProfileHeight = useDogProfileHeight();

  return (
    <Container>
      {isFocused ? <StatusBar style="light" /> : null}
      <BackgroundProfileContainer>
        <Animated.View style={imgStyle}>
          <UserDogProfileHeader />
        </Animated.View>
        <BackgroundOverlay style={overlayStyle} />
      </BackgroundProfileContainer>
      <ScrollContainer
        style={{
          marginTop: marginTop,
          borderBottomWidth: theme.stroke.sm,
          borderColor: theme.colors.border
        }}
      >
        <SettingsList
          bounces={false}
          contentContainerStyle={{
            paddingBottom: theme.spacing[4],
            paddingTop: dogProfileHeight - marginTop,
            flexGrow: 1,
            zIndex: 10
          }}
          ref={scrollRef}
          scrollEventThrottle={16}
          stickyHeaderIndices={[0]}
        >
          <Content>
            <Text fontWeight="bold" fontSize="lg">
              {t("profile.settings")}
            </Text>
          </Content>
          <View
            style={{
              backgroundColor: theme.colors.background,
              paddingVertical: theme.spacing[1]
            }}
          >
            <LocationConfig />
            <CurrentPlanConfig />

            <Config.Root onPress={() => router.push(SceneName.Preferences)}>
              <Filters width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.matchPreferences")}</Config.Title>
                <Config.Description>
                  {t("profile.matchPreferencesDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Config.Root onPress={() => router.push(SceneName.EditProfile)}>
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

            <Config.Root onPress={openTermsOfUse}>
              <Paperwork width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.termsOfUse")}</Config.Title>
                <Config.Description>
                  {t("profile.termsOfUseDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Config.Root onPress={openPrivacyPolicy}>
              <Paperwork width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.privacyPolicy")}</Config.Title>
                <Config.Description>
                  {t("profile.privacyPolicyDescription")}
                </Config.Description>
              </Config.Container>

              <Config.Arrow />
            </Config.Root>

            <Divider style={{ margin: theme.spacing[4] }} />

            <Config.Root onPress={handleLogout}>
              <SignOut width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title>{t("profile.logout")}</Config.Title>
              </Config.Container>
            </Config.Root>

            <Config.Root onPress={deleteAccount}>
              <Erase width={22} height={22} fill={theme.colors.text} />
              <Config.Container>
                <Config.Title color="destructive">
                  {t("profile.deleteAccount")}
                </Config.Title>
              </Config.Container>
            </Config.Root>
          </View>
        </SettingsList>
      </ScrollContainer>
    </Container>
  );
};

export default Profile;
