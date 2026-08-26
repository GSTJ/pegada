import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import Premium from "@/assets/images/Premium.svg";
import { BIO_NUMBER_OF_LINES } from "@/components/MainCard/components/PersonalInfo";
import * as PersonalInfo from "@/components/MainCard/components/PersonalInfo/styles";
import { Picture } from "@/components/MainCard/styles";
import { NetworkBoundary } from "@/components/NetworkBoundary";
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
