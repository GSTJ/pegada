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
import * as S from "./styles";

export const HEADER_HEIGHT = 65;

const DogProfileInfo = ({ dogId }: { dogId: string }) => {
  const [dog] = api.dog.get.useSuspenseQuery(
    { id: dogId },
    { refetchOnMount: false }
  );

  return (
    <S.ProfileInfoContainer>
      <S.Picture
        source={{
          uri: dog.images[0]?.url,
          blurhash: dog.images[0]?.blurhash ?? undefined
        }}
      />
      <Text numberOfLines={1} fontWeight="bold">
        {dog.name}
      </Text>
    </S.ProfileInfoContainer>
  );
};

const DogProfileError = () => {
  const { t } = useTranslation();
  return (
    <S.ProfileInfoContainer>
      <S.Picture />
      <Text numberOfLines={1}>{t("dogProfile.profileInfoError")}</Text>
    </S.ProfileInfoContainer>
  );
};

const DogProfileInfoLoading = () => {
  return (
    <S.ProfileInfoLoadingContainer>
      <ActivityIndicator />
    </S.ProfileInfoLoadingContainer>
  );
};

const Header = () => {
  const router = useRouter();

  const theme = useTheme();

  const { dogId, matchId } = useLocalSearchParams();

  const insets = useSafeAreaInsets();

  return (
    <S.Header
      style={{
        paddingTop: insets.top,
        height: HEADER_HEIGHT + insets.top
      }}
    >
      <S.BackTouchArea onPress={() => router.back()}>
        <BackArrow height={15} width={15} fill={theme.colors.text} />
      </S.BackTouchArea>
      <S.PressableAreaFlex
        onPress={() =>
          router.push({
            pathname: `${SceneName.Profile}/[id]`,
            params: { matchId: matchId ?? "", id: dogId as string }
          })
        }
      >
        <NetworkBoundary
          errorFallback={DogProfileError}
          suspenseFallback={<DogProfileInfoLoading />}
        >
          <DogProfileInfo dogId={dogId as string} />
        </NetworkBoundary>
      </S.PressableAreaFlex>
    </S.Header>
  );
};

export default Header;
