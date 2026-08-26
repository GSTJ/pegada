import type { DogCompleteClientSchema } from "@pegada/shared/schemas/dog-schema";

import { Platform, KeyboardAvoidingView, View, ScrollView } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { dogCompleteClientSchema } from "@pegada/shared/schemas/dog-schema";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import { useUnistyles } from "react-native-unistyles";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import BreedPicker from "@/components/BreedPicker";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { styles as componentsStyles } from "@/components/layout";
import { InputPicker } from "@/components/Picker";
import { getTrcpContext } from "@/contexts/trcp-context";
import { api } from "@/contexts/trpc-provider";
import { useDelayedHeaderHeight } from "@/hooks/use-delayed-header-height";
import { analytics } from "@/services/analytics";
import { colors, sizes } from "@/services/consts";
import { sendError } from "@/services/error-tracking";
import { maskDate } from "@/services/mask-date";
import { SceneName } from "@/types/scene-name";

import { Note, ProfileImage, styles } from "./styles";

const CompleteProfile = () => {
  const router = useRouter();
  const { t } = useTranslation();

  const { profileImageUrl } = useLocalSearchParams();

  const { control, handleSubmit, getValues, watch } =
    useForm<DogCompleteClientSchema>({
      defaultValues: {
        birthDate: "",
        breedId: "",
      },
      resolver: zodResolver(dogCompleteClientSchema),
    });

  const form = watch();

  const headerHeight = useDelayedHeaderHeight();

  const hasChanged = Object.values(form).some(Boolean);

  const myDogUpdateMutation = api.myDog.update.useMutation({
    onSuccess: (data) => {
      analytics.track({
        event_type: "Complete Dog Profile",
        event_properties: data ?? {},
      });
      getTrcpContext().myDog.get.setData(undefined, data);
      router.replace(SceneName.AskForLocation);
    },
    onError: (error) => {
      magicToast.alert(t("editProfile.profileError"));
      sendError(error);
    },
  });

  const saveUser = handleSubmit(async (data) => {
    if (hasChanged) {
      const { birthDate, breedId, color, size } = data;
      const dogData = {
        ...(birthDate && { birthDate }),
        ...(breedId && { breedId }),
        ...(color && { color }),
        ...(size && { size }),
      };

      await myDogUpdateMutation.mutateAsync(dogData);
    }

    if (!hasChanged) {
      analytics.track({ event_type: "Skip Complete Dog Profile" });
      router.replace(SceneName.AskForLocation);
    }
  });

  const { theme } = useUnistyles();

  const { scrollViewProps } = useBottomActionStyle();
  const continueText = hasChanged
    ? t("completeProfile.save")
    : t("common.skip");

  return (
    <KeyboardAvoidingView
      keyboardVerticalOffset={headerHeight}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={componentsStyles.keyboardScreen}
    >
      <View style={componentsStyles.fill}>
        <ScrollView
          {...scrollViewProps}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[4],
            paddingBottom:
              theme.spacing[8] +
              scrollViewProps.contentContainerStyle.paddingBottom,
          }}
          keyboardDismissMode="interactive"
          style={styles.container}
        >
          <View style={styles.imageContainer}>
            <ProfileImage
              source={{ uri: profileImageUrl as string }}
              style={styles.profileImage}
            />
          </View>

          <View style={componentsStyles.row}>
            <View style={componentsStyles.fill}>
              <Controller
                name="breedId"
                control={control}
                rules={{ required: true }}
                render={({ field: { onChange, value }, fieldState }) => (
                  <BreedPicker
                    testID="complete-profile-breed"
                    title={t("completeProfile.breed")}
                    breed={value}
                    setBreed={(breed) => onChange(breed.id)}
                    error={fieldState.error?.message}
                    optional
                  />
                )}
              />
            </View>

            <View style={styles.gap} />

            <View style={styles.wideColumn}>
              <Controller
                name="birthDate"
                control={control}
                rules={{ required: true }}
                render={({
                  field: { onChange, onBlur, value, name },
                  fieldState,
                }) => (
                  <Input
                    testID="complete-profile-birth-date"
                    title={t("completeProfile.birthDate")}
                    placeholder="DD/MM/YYYY"
                    value={value ?? ""}
                    onBlur={onBlur}
                    optional
                    onChangeText={(value: string) => {
                      const currentLength = getValues()[name]?.length ?? 0;
                      const isErasing = value.length < currentLength;

                      if (isErasing) return onChange(value);

                      // Mask to MM/DD/YYYY
                      onChange(maskDate(value));
                    }}
                    numberOfLines={1}
                    keyboardType="numeric"
                    error={fieldState.error?.message}
                  />
                )}
              />
            </View>
          </View>

          <View style={componentsStyles.row}>
            <Controller
              name="size"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, value }, fieldState }) => (
                <InputPicker
                  testID="complete-profile-size"
                  optional
                  title={t("completeProfile.size")}
                  placeholder={t("sizes.small")}
                  data={sizes}
                  value={sizes.find((sizeValue) => sizeValue.id === value)}
                  onChange={(size) => onChange(size.id)}
                  error={fieldState.error?.message}
                />
              )}
            />

            <View style={styles.gap} />
            <Controller
              name="color"
              control={control}
              rules={{ required: true }}
              render={({ field: { onChange, value }, fieldState }) => (
                <InputPicker
                  testID="complete-profile-color"
                  optional
                  title={t("completeProfile.color")}
                  placeholder={colors[0]?.name}
                  data={colors}
                  value={colors.find((color) => color.id === value)}
                  onChange={(color) => onChange(color.id)}
                  error={fieldState.error?.message}
                />
              )}
            />
          </View>

          <Note fontSize="xs" style={styles.note}>
            {t("completeProfile.additionalInfo")}
          </Note>
        </ScrollView>
        <BottomAction.Container>
          <Button
            loading={myDogUpdateMutation.isPending}
            onPress={() => saveUser()}
            testID="profile-submit"
          >
            {continueText}
          </Button>
        </BottomAction.Container>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CompleteProfile;
