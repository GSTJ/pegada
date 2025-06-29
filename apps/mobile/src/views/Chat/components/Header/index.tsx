import { ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import BackArrow from "@/assets/images/BackArrow.svg";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/Text";
import { api } from "@/contexts/TRPCProvider";
import { SceneName } from "@/types/SceneName";
import {
  BackTouchArea,
  Picture,
  PressableAreaFlex,
  ProfileInfoContainer,
  ProfileInfoLoadingContainer,
  Header as StyledHeader
} from "./styles";

export const HEADER_HEIGHT = 65;

const DogProfileInfo = ({ dogId }: { dogId: string }) => {
  const [dog] = api.dog.get.useSuspenseQuery(
    { id: dogId },
    { refetchOnMount: false }
  );

  return (
    <ProfileInfoContainer>
      <Picture
        source={{
          uri: dog.images[0]?.url,
          blurhash: dog.images[0]?.blurhash ?? undefined
        }}
      />
      <Text numberOfLines={1} fontWeight="bold">
        {dog.name}
      </Text>
    </ProfileInfoContainer>
  );
};

const DogProfileError = () => {
  const { t } = useTranslation();
  return (
    <ProfileInfoContainer>
      <Picture />
      <Text numberOfLines={1}>{t("dogProfile.profileInfoError")}</Text>
    </ProfileInfoContainer>
  );
};

const DogProfileInfoLoading = () => {
  return (
    <ProfileInfoLoadingContainer>
      <ActivityIndicator />
    </ProfileInfoLoadingContainer>
  );
};

const Header = () => {
  const router = useRouter();

  const theme = useTheme();

  const { dogId, matchId } = useLocalSearchParams();

  const insets = useSafeAreaInsets();

  return (
    <StyledHeader
      style={{
        paddingTop: insets.top,
        height: HEADER_HEIGHT + insets.top
      }}
    >
      <BackTouchArea
        onPress={() => {
          router.back();
        }}
      >
        <BackArrow height={15} width={15} fill={theme.colors.text} />
      </BackTouchArea>
      <PressableAreaFlex
        onPress={() => {
          router.push({
            pathname: `${SceneName.Profile}/[id]`,
            params: { matchId: matchId ?? "", id: dogId as string }
          });
        }}
      >
        <NetworkBoundary
          errorFallback={DogProfileError}
          suspenseFallback={<DogProfileInfoLoading />}
        >
          <DogProfileInfo dogId={dogId as string} />
        </NetworkBoundary>
      </PressableAreaFlex>
    </StyledHeader>
  );
};

export default Header;
