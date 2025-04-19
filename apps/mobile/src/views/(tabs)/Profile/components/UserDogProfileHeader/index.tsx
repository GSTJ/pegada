import { ActivityIndicator, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "styled-components/native";

import Premium from "@/assets/images/Premium.svg";
import { BIO_NUMBER_OF_LINES } from "@/components/MainCard/components/PersonalInfo";
import * as PersonalInfo from "@/components/MainCard/components/PersonalInfo/styles";
import { Container, Picture } from "@/components/MainCard/styles";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { api } from "@/contexts/TRPCProvider";
import { useCustomerPlan } from "@/hooks/usePayments";
import { UserPlan } from "@/services/payments";
import { useGetFormattedYears } from "@/services/useGetFormattedYears";
import {
  ProfileContainer,
  ProfileUnknownError
} from "@/views/(tabs)/Profile/components/UserDogProfileHeader/styles";

export const useDogProfileHeight = () => {
  const { height } = useWindowDimensions();
  return height / 2.5;
};

const UserDogProfileHeader = () => {
  const dogProfileHeight = useDogProfileHeight();
  const [dog] = api.myDog.get.useSuspenseQuery(undefined, {
    refetchOnMount: false
  });

  const theme = useTheme();

  const plan = useCustomerPlan();

  const getFormattedYears = useGetFormattedYears();

  if (!dog) {
    throw new Error("Dog not found");
  }

  return (
    <Container style={{ height: dogProfileHeight, borderRadius: 0 }}>
      <Picture
        source={{
          uri: dog.images[0]?.url,
          blurhash: dog.images[0]?.blurhash ?? undefined
        }}
      />
      <LinearGradient
        style={{ marginTop: "auto" }}
        colors={[
          "rgba(0, 0, 0, 0)",
          "rgba(0, 0, 0, .5)",
          "rgba(0, 0, 0, .5)",
          "rgba(0, 0, 0, .7)"
        ]}
      >
        <PersonalInfo.Container style={{ paddingBottom: 35 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing[1.5]
            }}
          >
            <PersonalInfo.Name
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
              <Premium fill={theme.colors.premium} width={22} height={22} />
            ) : null}
          </View>
          {dog.bio ? (
            <PersonalInfo.Description
              numberOfLines={BIO_NUMBER_OF_LINES}
              style={{ fontSize: theme.typography.sizes.sm.size }}
            >
              {dog.bio}
            </PersonalInfo.Description>
          ) : null}
        </PersonalInfo.Container>
      </LinearGradient>
    </Container>
  );
};

const LoadingFallback = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dogProfileHeight = useDogProfileHeight();

  return (
    <ProfileContainer
      style={{
        paddingTop: insets.top,
        height: dogProfileHeight
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
      <LinearGradient
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        colors={["rgba(0, 0, 0, .5)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)"]}
      />
    </View>
  );
};

export default WrappedUserDogProfileHeader;
