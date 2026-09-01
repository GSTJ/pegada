import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import Premium from "@/assets/images/Premium.svg";
import ShareIcon from "@/assets/images/Share.svg";
import { showDogShareOptions } from "@/components/DogShareOptions";
import Glassmorphism from "@/components/Glassmorphism";
import { BIO_NUMBER_OF_LINES } from "@/components/MainCard/components/PersonalInfo";
import * as PersonalInfo from "@/components/MainCard/components/PersonalInfo/styles";
import { Picture } from "@/components/MainCard/styles";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { PressableArea } from "@/components/pressable-area";
import { api } from "@/contexts/trpc-provider";
import { useCustomerPlan } from "@/hooks/use-payments";
import { UserPlan } from "@/services/payments";
import { useGetFormattedYears } from "@/services/use-get-formatted-years";
import {
  HeaderCard,
  InfoBlock,
  NameRow,
  ProfileContainer,
  ProfileUnknownError,
  Scrim,
  Shade,
  styles,
} from "@/views/(tabs)/Profile/components/UserDogProfileHeader/styles";

export const useDogProfileHeight = () => {
  const { height } = useWindowDimensions();
  return height / 2.5;
};

const UserDogProfileHeader = () => {
  const dogProfileHeight = useDogProfileHeight();
  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false,
  });

  const { theme } = useUnistyles();

  const plan = useCustomerPlan();

  const getFormattedYears = useGetFormattedYears();

  if (!dog) {
    throw new Error("Dog not found");
  }

  return (
    <HeaderCard style={{ height: dogProfileHeight }}>
      <Picture
        source={{
          uri: dog.images[0]?.url,
          blurhash: dog.images[0]?.blurhash ?? undefined,
        }}
      />
      <Shade
        colors={[
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, .5)",
          "rgba(0, 0, 0, .5)",
          "rgba(0, 0, 0, .7)",
        ]}
      >
        <InfoBlock>
          <NameRow style={{ gap: theme.spacing[1.5] }}>
            <PersonalInfo.Name
              testID="profile-dog-name"
              style={{ fontSize: theme.typography.sizes.xl.size }}
            >
              {dog.name}
              {dog.birthDate ? (
                <PersonalInfo.Age
                  style={{ fontSize: theme.typography.sizes.lg.size }}
                >
                  , {getFormattedYears(dog.birthDate)}
                </PersonalInfo.Age>
              ) : null}
            </PersonalInfo.Name>
            {plan.data?.userPlan === UserPlan.Premium ? (
              <Premium
                testID="profile-premium-badge"
                fill={theme.colors.premium}
                width={22}
                height={22}
              />
            ) : null}
          </NameRow>
          {dog.bio ? (
            <PersonalInfo.Description
              numberOfLines={BIO_NUMBER_OF_LINES}
              style={{ fontSize: theme.typography.sizes.sm.size }}
            >
              {dog.bio}
            </PersonalInfo.Description>
          ) : null}
        </InfoBlock>
      </Shade>
    </HeaderCard>
  );
};

const LoadingFallback = () => {
  const { theme } = useUnistyles();
  const insets = useSafeAreaInsets();
  const dogProfileHeight = useDogProfileHeight();

  return (
    <ProfileContainer
      style={{
        paddingTop: insets.top,
        height: dogProfileHeight,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
    </ProfileContainer>
  );
};

const WrappedUserDogProfileHeader = () => {
  const dogProfileHeight = useDogProfileHeight();

  return (
    <View style={{ height: dogProfileHeight }}>
      <NetworkBoundary
        errorFallback={ProfileUnknownError}
        suspenseFallback={<LoadingFallback />}
      >
        <UserDogProfileHeader />
      </NetworkBoundary>
      <Scrim
        colors={["rgba(0, 0, 0, .5)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]}
      />
    </View>
  );
};

export default WrappedUserDogProfileHeader;

/**
 * The share button, floating over the photo's top-right corner.
 *
 * Rendered as the LAST sibling in `Profile/index.tsx`'s root view, not
 * nested inside `UserDogProfileHeader` above. The button's top edge sits
 * just below the settings `ScrollView`'s own top edge (`marginTop`), so its
 * hitbox falls inside the ScrollView's frame — and the ScrollView, being a
 * later sibling of the photo header in the tree, paints on top of it there.
 * A plain RN view captures touches for its whole frame by default even
 * where it paints nothing (transparent background, no rows laid out yet),
 * so the ScrollView ate the tap before it ever reached the button
 * underneath. `pointerEvents="none"` on the ScrollView isn't an option
 * either — that would also disable scrolling. Rendering this button as a
 * sibling declared after the ScrollView, instead of inside the photo
 * header, puts it on top for that overlapping region and sidesteps the
 * conflict entirely. Verified by reproducing the swallowed tap with the
 * button nested back in its original spot, then confirming it starts
 * working again the moment it moves after the ScrollView in the tree —
 * with no other change required.
 *
 * `api.myDog.get` is called again here rather than threading the query
 * result down as a prop — react-query dedupes by query key, so this shares
 * the cache with `UserDogProfileHeader`'s own call instead of firing a
 * second request.
 */
const ProfileShareButton = () => {
  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false,
  });

  const { theme } = useUnistyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!dog) return null;

  return (
    <PressableArea
      testID="profile-dog-share"
      accessible
      accessibilityRole="button"
      accessibilityLabel={t("dogProfile.shareProfile", { name: dog.name })}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPress={() => showDogShareOptions(dog)}
      style={[styles.shareButton, { top: insets.top + theme.spacing[3] }]}
    >
      <Glassmorphism style={styles.shareButtonGlass}>
        <View style={styles.shareButtonContent}>
          <ShareIcon width={18} height={18} fill={theme.colors.primary} />
        </View>
      </Glassmorphism>
    </PressableArea>
  );
};

const NullFallback = () => null;

export const WrappedProfileShareButton = () => (
  <NetworkBoundary errorFallback={NullFallback} suspenseFallback={null}>
    <ProfileShareButton />
  </NetworkBoundary>
);
