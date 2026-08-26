import { ActivityIndicator, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUnistyles } from "react-native-unistyles";

import BackArrow from "@/assets/images/BackArrow.svg";
import { NetworkBoundary } from "@/components/NetworkBoundary";
import { Text } from "@/components/text";
import { api } from "@/contexts/trpc-provider";
import { SceneName } from "@/types/scene-name";

import * as S from "./styles";
import { styles } from "./styles";

export const HEADER_HEIGHT = 65;

const DogProfileInfo = ({ dogId }: { dogId: string }) => {
  const [dog] = api.dog.get.useSuspenseQuery(
    { id: dogId },
    { refetchOnMount: false },
  );

  return (
    <View style={styles.profileInfoContainer}>
      <S.Picture
        source={{
          uri: dog.images[0]?.url,
          blurhash: dog.images[0]?.blurhash ?? undefined,
        }}
        style={styles.picture}
      />
      <Text numberOfLines={1} fontWeight="bold">
        {dog.name}
      </Text>
    </View>
  );
};

const DogProfileError = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.profileInfoContainer}>
      <S.Picture style={styles.picture} />
      <Text numberOfLines={1}>{t("dogProfile.profileInfoError")}</Text>
    </View>
  );
};

const DogProfileInfoLoading = () => {
  return (
    <View style={styles.profileInfoLoadingContainer}>
      <ActivityIndicator />
    </View>
  );
};

const Header = () => {
  const router = useRouter();

  const { theme } = useUnistyles();

  const { dogId, matchId } = useLocalSearchParams();

  const insets = useSafeAreaInsets();

  return (
    <S.Header
      style={[
        styles.header,
        {
          paddingTop: insets.top,
          height: HEADER_HEIGHT + insets.top,
        },
      ]}
    >
      <S.BackTouchArea
        testID="chat-back"
        onPress={() => router.back()}
        style={styles.backTouchArea}
      >
        <BackArrow height={15} width={15} fill={theme.colors.text} />
      </S.BackTouchArea>
      <S.PressableAreaFlex
        onPress={() =>
          router.push({
            pathname: `${SceneName.Profile}/[id]`,
            params: { matchId: matchId ?? "", id: dogId as string },
          })
        }
        style={styles.pressableAreaFlex}
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
