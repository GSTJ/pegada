import { View } from "react-native";
import { router } from "expo-router";
import { Header, HeaderBackButton } from "@react-navigation/elements";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components/native";

import { UnknownErrorComponent } from "@/components/NetworkBoundary";

const ProfileErrorState = () => {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={{ flexGrow: 1, backgroundColor: theme.colors.background }}>
      <Header
        title={t("dogProfile.dogProfile")}
        headerLeft={() => (
          <HeaderBackButton
            displayMode="minimal"
            tintColor={theme.colors.primary}
            onPress={() => router.back()}
          />
        )}
        headerRightContainerStyle={{ paddingRight: 16 }}
        headerLeftContainerStyle={{ paddingLeft: 16 }}
        headerTintColor={theme.colors.text}
        headerTitleStyle={{
          fontFamily: theme.typography.fontFamily.bold,
          fontWeight: "bold",
          fontSize: theme.typography.sizes.lg.size,
        }}
        headerStyle={{ backgroundColor: theme.colors.background }}
      />
      <UnknownErrorComponent />
    </View>
  );
};

export default ProfileErrorState;
