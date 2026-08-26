import type { ProfileImagesUploaderProps } from "@/components/ProfileImageUploader";
import type { Picture } from "@/components/ProfileImageUploader/utils";
import type { DogQuickClientSchema } from "@pegada/shared/schemas/dog-schema";

import { useState } from "react";
import { Platform, KeyboardAvoidingView, View, ScrollView } from "react-native";

import { useRouter } from "expo-router";

import { zodResolver } from "@hookform/resolvers/zod";
import { dogQuickClientSchema } from "@pegada/shared/schemas/dog-schema";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { magicToast } from "react-native-magic-toast";
import { useUnistyles } from "react-native-unistyles";

import { BottomAction, useBottomActionStyle } from "@/components/BottomAction";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { styles as componentsStyles } from "@/components/layout";
import { ProfileImagesUploader } from "@/components/ProfileImageUploader";
import { pictures } from "@/components/ProfileImageUploader/utils";
import { RadioButtons } from "@/components/RadioButtons";
import { Text } from "@/components/text";
import { getTrcpContext } from "@/contexts/trcp-context";
import { api } from "@/contexts/trpc-provider";
import { useDelayedHeaderHeight } from "@/hooks/use-delayed-header-height";
import { analytics } from "@/services/analytics";
import { sendError } from "@/services/error-tracking";
import { SceneName } from "@/types/scene-name";

import { DragHint, MultilineInput, PhotoHint, styles } from "./styles";

const DEFAULT_VALUES: DogQuickClientSchema = {
  name: "",
  bio: "",
  images: pictures,
  gender: "MALE",
};

const CreateProfile = () => {
  const { t } = useTranslation();

  const { control, handleSubmit, getValues } = useForm({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(dogQuickClientSchema),
  });

  const headerHeight = useDelayedHeaderHeight();

  const router = useRouter();

  const dogCreateMutation = api.dog.create.useMutation({
    onMutate: () => {
      analytics.track({ event_type: "Save Profile Pressed" });
    },
    onSuccess: (data) => {
      getTrcpContext().myDog.get.setData(undefined, data);

      analytics.track({
        event_type: "Create Dog Profile",
        event_properties: {
          name: data.name,
          gender: data.gender,
        },
      });

      router.replace({
        pathname: SceneName.CompleteProfile,
        params: {
          dogId: data.id,
          // Todo: don't - use caches
          profileImageUrl: data.images[0]?.url ?? "",
        },
      });
    },
    onError: (error) => {
      magicToast.alert(t("editProfile.profileError"));
      sendError(error);
    },
  });

  const saveUser = handleSubmit(async (data) => {
    const dogData = {
      name: data.name,
      bio: data.bio,
      gender: data.gender,
      images: data.images
        .filter((image) => Boolean(image.url))
        .map((image, index) => ({
          id: image.id,
          url: image.url as string,
          position: index,
        })),
    };

    await dogCreateMutation.mutateAsync(dogData);
  });

  const [gesturesEnabled, setGesturesEnabled] = useState(true);

  const { theme } = useUnistyles();

  const { scrollViewProps } = useBottomActionStyle();

  return (
    <KeyboardAvoidingView
      keyboardVerticalOffset={headerHeight}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={componentsStyles.keyboardScreen}
    >
      <View style={componentsStyles.fill}>
        <ScrollView
          style={styles.container}
          {...scrollViewProps}
          contentContainerStyle={{
            padding: theme.spacing[4],
            paddingBottom:
              theme.spacing[4] +
              scrollViewProps.contentContainerStyle.paddingBottom,
          }}
          scrollEnabled={gesturesEnabled}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            name="images"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => (
              <>
                <Text fontWeight="bold" fontSize="lg">
                  {t("createProfile.profilePictures")}
                </Text>
                <PhotoHint fontSize="xs" style={styles.photoHint}>
                  {t("createProfile.minimumOnePhoto")}
                </PhotoHint>
                <ProfileImagesUploader
                  setGesturesEnabled={setGesturesEnabled}
                  value={value as Picture[]}
                  onChange={(
                    cb: Parameters<ProfileImagesUploaderProps["onChange"]>[0],
                  ) => {
                    // This getValues is needed to ensure the update happens
                    // correctly even when adding images fast.
                    onChange(cb(getValues("images") as Picture[]));
                  }}
                  error={fieldState.error?.message}
                />
                <DragHint
                  fontSize="xs"
                  fontWeight="medium"
                  style={styles.dragHint}
                >
                  {t("createProfile.clickAndHold")}
                </DragHint>
              </>
            )}
          />
          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <Input
                testID="profile-name"
                title={t("createProfile.dogName")}
                placeholder={t("createProfile.howToCallDog")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={50}
                error={fieldState.error?.message}
                autoCorrect={false}
              />
            )}
          />
          <Controller
            name="bio"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value }, fieldState }) => (
              <MultilineInput
                title={t("createProfile.bio")}
                placeholder={t("createProfile.tellSomethingCool")}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                maxLength={500}
                multiline
                optional
                error={fieldState.error?.message}
                style={styles.multilineInput}
              />
            )}
          />
          <Controller
            name="gender"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, value } }) => (
              <RadioButtons
                title={t("completeProfile.gender")}
                data={[t("completeProfile.male"), t("completeProfile.female")]}
                value={
                  value === "MALE"
                    ? t("completeProfile.male")
                    : t("completeProfile.female")
                }
                onChange={(value) => {
                  onChange(
                    value === t("completeProfile.male") ? "MALE" : "FEMALE",
                  );
                }}
              />
            )}
          />
        </ScrollView>
        <BottomAction.Container>
          <Button
            loading={dogCreateMutation.isPending}
            onPress={() => saveUser()}
            testID="profile-submit"
          >
            {t("createProfile.createProfile")}
          </Button>
        </BottomAction.Container>
      </View>
    </KeyboardAvoidingView>
  );
};

export default CreateProfile;
